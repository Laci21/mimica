from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any
import asyncio
import json

from agents import Agent, Runner, RunConfig

from src.data_models import TKFUpdate
from src.utils import llm_gpt_4o


MAX_TKF_UPDATES = 100_000


class TKFStoreFullError(Exception):
    """Raised when the in-memory TKF store has reached its maximum capacity."""


class TKFStore(ABC):
    """Abstract TKF store."""

    @abstractmethod
    async def add_update(self, update: TKFUpdate, full_content: str) -> None:
        """
        Add a TKF update to the store.

        Creates TKF update if doesn't exist.
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

    async def add_update(self, update: TKFUpdate, full_content: str) -> None:
        async with self._lock:
            if len(self._updates) >= self._max_updates:
                raise TKFStoreFullError(
                    f"TKF store is full (max={self._max_updates}); cannot add more updates."
                )
            print(f"[TKF] Adding update: {update.model_dump_json()}")
            self._updates.append(update)
            self._full_content = full_content

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