from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any
import asyncio

from src.data_models import TestEvent


MAX_TEST_EVENTS = 100_000


class EventStoreFullError(Exception):
    """Raised when the in-memory event store has reached its maximum capacity."""


class TestEventRepository(ABC):
    """Abstract repository for workflow event storage."""

    @abstractmethod
    async def add_event(self, event: TestEvent) -> None:
        """
        Add an event to a session's event log.

        Creates event log if doesn't exist.
        """
        raise NotImplementedError

    @abstractmethod
    async def get_events(
        self,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[TestEvent], int]:
        """
        Get events with pagination.

        Returns:
            tuple[list[TestEvent], int]: (events, total_count)
        """
        raise NotImplementedError

    @abstractmethod
    async def get_events_by_group_id(self, group_id: str) -> list[TestEvent]:
        """Get events by group id."""
        raise NotImplementedError

    @abstractmethod
    async def get_events_by_persona_id(self, persona_id: str) -> list[TestEvent]:
        """Get events by persona id."""
        raise NotImplementedError

    @abstractmethod
    async def get_events_by_session_id(self, session_id: str) -> list[TestEvent]:
        """Get events by session id."""
        raise NotImplementedError


class InMemoryTestEventRepository(TestEventRepository):
    """In-memory implementation of TestEventRepository with a bounded buffer."""

    def __init__(self, max_events: int = MAX_TEST_EVENTS) -> None:
        self._events: list[TestEvent] = []
        self._group_id_index: dict[str, list[int]] = {}
        self._persona_id_index: dict[str, list[int]] = {}
        self._session_id_index: dict[str, list[int]] = {}
        self._max_events = max_events
        self._lock = asyncio.Lock()

    async def add_event(self, event: TestEvent) -> None:
        async with self._lock:
            if len(self._events) >= self._max_events:
                raise EventStoreFullError(
                    f"Event store is full (max={self._max_events}); cannot add more events."
                )
            self._events.append(event)
            index = len(self._events) - 1
            if event.group_id not in self._group_id_index:
                self._group_id_index[event.group_id] = []
            self._group_id_index[event.group_id].append(index)
            if event.persona_id not in self._persona_id_index:
                self._persona_id_index[event.persona_id] = []
            self._persona_id_index[event.persona_id].append(index)
            if event.session_id not in self._session_id_index:
                self._session_id_index[event.session_id] = []
            self._session_id_index[event.session_id].append(index)

    async def get_events(
        self,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[TestEvent], int]:
        async with self._lock:
            total = len(self._events)
            start = max(offset, 0)
            end = start + max(limit, 0)
            return self._events[start:end], total

    async def get_events_by_group_id(self, group_id: str) -> list[TestEvent]:
        async with self._lock:
            indices = self._group_id_index.get(group_id, [])
            return [self._events[i] for i in indices]

    async def get_events_by_persona_id(self, persona_id: str) -> list[TestEvent]:
        async with self._lock:
            indices = self._persona_id_index.get(persona_id, [])
            return [self._events[i] for i in indices]

    async def get_events_by_session_id(self, session_id: str) -> list[TestEvent]:
        async with self._lock:
            indices = self._session_id_index.get(session_id, [])
            return [self._events[i] for i in indices]
