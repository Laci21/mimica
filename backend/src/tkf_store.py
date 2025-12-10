from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any
import asyncio

from src.data_models import TKFUpdate


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

    async def seed(self, full_content: str) -> None:
        async with self._lock:
            self._full_content = full_content

    async def get_updates_by_metadata_filter(self, metadata_filter: dict) -> list[TKFUpdate]:
        async with self._lock:
            return [update for update in self._updates if all(update.metadata.get(key) == value for key, value in metadata_filter.items())]


tkf = InMemoryTKFStore()