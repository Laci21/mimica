from datetime import datetime
import json
from pathlib import Path
import uuid

from agents import RunConfig, Runner
from src.tracking import propagate_attributes
from src.tkf import get_tkf_agent
from src.tkf_store import TKFStore
from src.knowledge_generator import KnowledgeGenerator
from src.persona_repository import repository as persona_repo
from src.data_models import TestEvent
from src.event_store import TestEventRepository


async def seed_from_playwright_events(path: str, event_store: TestEventRepository) -> list[str]:
    """
    Load all Playwright events from a parent directory.

    Each direct subdirectory of `path` is expected to contain an `events.json`
    file. This function iterates those subdirectories, loads each file via
    `_load_playwright_events_file`, and returns a combined list of `TestEvent`s.
    """
    group_id: set[str] = set()
    base_dir = Path(path)
    if not base_dir.exists():
        raise FileNotFoundError(f"Playwright runs directory not found: {path}")

    all_events: list[TestEvent] = []

    for child in base_dir.iterdir():
        if not child.is_dir():
            continue
        events_file = child / "events.json"
        if events_file.is_file():
            events = _load_playwright_events_file(str(events_file))
            for event in events:
                await event_store.add_event(event)
                group_id.add(event.group_id)
    return list(group_id)


def _load_playwright_events_file(file_path: str) -> list[TestEvent]:
    with open(file_path, "r") as f:
        events = json.load(f)
    results: list[TestEvent] = []
    for event in events:
        event = TestEvent(
            id=str(uuid.uuid4()),
            session_id=event["run_id"],
            persona_id=event["persona_id"],
            group_id=event["run_group_id"],
            created_at= datetime.fromtimestamp(event["timestamp"]).isoformat(),
            sentiment=event["status"],
            screen_id=event["screen_id"],
            reasoning_text=event["reasoning_text"],
            action=event["action"],
            target_selector=event["target_selector"],
        )
        results.append(event)
    return results

def _get_tkf_init_knowledge() -> str:
    with open(Path(__file__).parent.parent / "data" / "knowledge" / "tkf_init_knowledge.json", "r") as f:
        return f.read()

class Workflow:
    def __init__(self, event_store: TestEventRepository, tkf_store: TKFStore):
        self.event_store = event_store
        self.tkf_store = tkf_store

    async def initialize_tkf(self):
        tkf_init_knowledge = _get_tkf_init_knowledge()
        await self.tkf_store.seed(tkf_init_knowledge)

    async def process_from_playwright_events(self):
        group_ids = await seed_from_playwright_events(str(Path(__file__).parent.parent / "playwright-runs"), self.event_store)
        for group_id in group_ids:
            await self.process_run(group_id)
        return group_ids

    async def _process_event_to_knowledge(self, run_id: str) -> list[str]:
        events = await self.event_store.get_events_by_group_id(run_id)

        event_by_persona: dict[str, list[TestEvent]] = {}
        for event in events:
            if event.persona_id not in event_by_persona:
                event_by_persona[event.persona_id] = []
            event_by_persona[event.persona_id].append(event)

        knowledge_list: list[str] = []
        for persona_id, events in event_by_persona.items():
            persona = persona_repo.get_by_id(persona_id)
            if persona is None:
                print(f"WARNING: Persona not found: {persona_id}")
                continue
            knowledge_generator = KnowledgeGenerator(persona, events)
            knowledge = await knowledge_generator.generate_knowledge()
            print(f"Generated knowledge for persona: {persona.display_name}, knowledge: {knowledge}")
            knowledge_list.append("\n".join(knowledge))
        return knowledge_list


    async def process_run(self, group_id: str):
        agent = get_tkf_agent()
        knowledge_list = await self._process_event_to_knowledge(group_id)
        with propagate_attributes(
            session_id=group_id,
            tags=[f"run_{group_id}"],
            metadata={"agent_name": agent.name},
        ):
            for knowledge in knowledge_list:
                result = await Runner.run(
                    agent, input=knowledge, run_config=RunConfig(tracing_disabled=False)
                )
                print(result.final_output)