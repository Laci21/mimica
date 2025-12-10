from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any
import asyncio
import json

from agents import Agent, Runner, RunConfig

from src.data_models import TKFUpdate
from src.utils import call_llm, llm_gpt_4o


MAX_TKF_UPDATES = 100_000


class TKFStoreFullError(Exception):
    """Raised when the in-memory TKF store has reached its maximum capacity."""


class TKFStore(ABC):
    """Abstract TKF store."""

    @abstractmethod
    async def add_update(self, update: TKFUpdate) -> None:
        """
        Add a TKF update to the store.
        The store manages full_content internally with automatic appending,
        duplicate detection, and conflict checking.
        """
        raise NotImplementedError

    @abstractmethod
    async def get_updates(
        self,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[TKFUpdate], int]:
        """
        Get TKF updates with pagination.

        Returns:
            tuple[list[TKFUpdate], int]: (updates, total_count)
        """
        raise NotImplementedError

    @abstractmethod
    async def get_updates_by_metadata_filter(self, metadata_filter: dict) -> list[TKFUpdate]:
        """Get TKF updates by metadata filter."""
        raise NotImplementedError

    @abstractmethod
    async def get_full_content(self) -> str:
        """Get the full content of the TKF."""
        raise NotImplementedError

    @abstractmethod
    async def seed(self, full_content: str) -> None:
        """Seed the full content of the TKF."""
        raise NotImplementedError


class InMemoryTKFStore(TKFStore):
    """In-memory implementation of TKFStore with a bounded buffer."""

    def __init__(self, max_updates: int = MAX_TKF_UPDATES) -> None:
        self._updates: list[TKFUpdate] = []
        self._max_updates = max_updates
        self._full_content = ""
        self._lock = asyncio.Lock()

    async def _is_duplicate(self, new_text: str, existing_content: str) -> bool:
        """
        Check if new_text is semantically duplicate/redundant with existing TKF content.
        Uses LLM to determine semantic similarity.
        """
        if not existing_content.strip():
            return False
        
        instructions = "You are a knowledge deduplication expert. Return only 'true' or 'false' as a JSON boolean."
        prompt = (
            "Determine if the new knowledge is semantically duplicate or redundant with existing knowledge.\n\n"
            "Return 'true' if:\n"
            "- The new knowledge conveys essentially the same information as existing knowledge\n"
            "- The new knowledge is a subset of existing knowledge\n"
            "- The new knowledge would be redundant to add\n\n"
            "Return 'false' if:\n"
            "- The new knowledge adds new information or perspective\n"
            "- The new knowledge is complementary but not redundant\n"
            "- The new knowledge provides additional detail or context\n\n"
            f"Existing TKF content:\n{existing_content}\n\n"
            f"New knowledge to check:\n{new_text}\n\n"
            "Return JSON boolean: true if duplicate/redundant, false if should be added."
        )
        
        response = await call_llm("tkf_duplicate_checker", instructions, prompt)
        return "true" in response.lower()

    async def _has_conflict(self, new_text: str, existing_content: str) -> bool:
        """
        Check if new_text conflicts with or contradicts existing TKF content.
        Uses LLM to determine semantic conflicts.
        """
        if not existing_content.strip():
            return False
        
        instructions = "You are a knowledge consistency validator. Return only 'true' or 'false' as a JSON boolean."
        prompt = (
            "Determine if the new knowledge contradicts or conflicts with existing knowledge.\n\n"
            "Return 'true' if:\n"
            "- The new knowledge directly contradicts existing knowledge\n"
            "- The new knowledge makes opposing claims\n"
            "- Adding the new knowledge would create inconsistency\n\n"
            "Return 'false' if:\n"
            "- The new knowledge is consistent with existing knowledge\n"
            "- The new knowledge provides a different perspective without contradiction\n"
            "- The new knowledge can coexist with existing knowledge\n\n"
            f"Existing TKF content:\n{existing_content}\n\n"
            f"New knowledge to check:\n{new_text}\n\n"
            "Return JSON boolean: true if conflict exists, false if consistent."
        )
        
        response = await call_llm("tkf_conflict_checker", instructions, prompt)
        return "true" in response.lower()

    async def add_update(self, update: TKFUpdate) -> None:
        # First, acquire lock to log update and check for early exits
        async with self._lock:
            if len(self._updates) >= self._max_updates:
                raise TKFStoreFullError(
                    f"TKF store is full (max={self._max_updates}); cannot add more updates."
                )
            print(f"[TKF] Adding update: {update.model_dump_json()}")
            self._updates.append(update)
            
            new_text = update.new_text.strip()
            
            if not new_text:
                print(f"[TKF] Empty new_text - skipping")
                return
            
            # If old_text is specified and exists, replace it (simple string match for explicit replacements)
            if update.old_text and update.old_text.strip() in self._full_content:
                print(f"[TKF] Replacing old text with new text")
                self._full_content = self._full_content.replace(update.old_text.strip(), new_text)
                return
            
            # Take a snapshot of current content for LLM checks (release lock during slow LLM calls)
            current_content = self._full_content
        
        # Release lock for LLM calls (they can be slow and we have a snapshot)
        print(f"[TKF] Checking for semantic duplicates...")
        is_duplicate = await self._is_duplicate(new_text, current_content)
        if is_duplicate:
            print(f"[TKF] Semantic duplicate detected - skipping addition")
            return
        
        print(f"[TKF] Checking for conflicts with existing knowledge...")
        has_conflict = await self._has_conflict(new_text, current_content)
        if has_conflict:
            print(f"[TKF] Conflict detected - skipping addition (existing knowledge takes precedence)")
            return
        
        # Re-acquire lock to append
        async with self._lock:
            # Append new content with proper spacing
            if self._full_content:
                self._full_content = self._full_content.rstrip() + "\n\n" + new_text
            else:
                self._full_content = new_text
            print(f"[TKF] Appended new content to TKF")

    async def get_updates(
        self,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[TKFUpdate], int]:
        async with self._lock:
            total = len(self._updates)
            start = max(offset, 0)
            end = start + max(limit, 0)
            return self._updates[start:end], total

    async def get_full_content(self) -> str:
        async with self._lock:
            return self._full_content

    async def _format_seed_content(self, raw_content: str) -> str:
        knowledge_data = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
        
        agent = Agent(
            name="tkf_formatter",
            instructions="Format a list of knowledge facts into a coherent, non-redundant knowledge base text without information loss.",
            model=llm_gpt_4o,
        )
        
        prompt = f"Format these knowledge facts into a coherent knowledge base text. Remove redundancy but preserve all information:\n\n{json.dumps(knowledge_data, indent=2)}"
        
        result = await Runner.run(
            agent,
            input=prompt,
            run_config=RunConfig(tracing_disabled=True)
        )
        
        return result.final_output

    async def seed(self, full_content: str) -> None:
        processed_content = await self._format_seed_content(full_content)
        async with self._lock:
            self._full_content = processed_content

    async def get_updates_by_metadata_filter(self, metadata_filter: dict) -> list[TKFUpdate]:
        async with self._lock:
            return [update for update in self._updates if all(update.metadata.get(key) == value for key, value in metadata_filter.items())]


tkf = InMemoryTKFStore()