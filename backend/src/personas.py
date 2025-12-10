from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Literal, TypedDict

import json


PersonaId = str


class PersonaPromptConfig(TypedDict):
    system: str
    behavioralRules: List[str]


class PersonaMeta(TypedDict, total=False):
    version: int
    author: str
    createdAt: str
    tags: List[str]


class PersonaBehavior(TypedDict):
    # 1) What the persona primarily optimizes for
    goalOrientation: Literal["task_completion", "exploration", "evaluation", "support"]
    # 2) How quickly they give up when encountering friction (0.0–1.0)
    patienceLevel: float
    # 3) How deeply they read content
    readingStyle: Literal["skim", "balanced", "deep"]
    # 4) How they seek help when something is unclear
    helpSeeking: Literal["avoid_docs", "prefer_docs", "ask_for_help", "trial_and_error"]
    # 5) Comfort with trying risky/uncertain actions (0.0–1.0)
    riskTolerance: float
    # 6) Navigation preference: short path vs exploration
    navigationStyle: Literal["direct", "mixed", "exploratory"]
    # 7) Overall curiosity about trying alternative flows (0.0–1.0)
    explorationLevel: float
    # 8) Any accessibility-relevant traits
    accessibilityProfile: List[str]


class PersonaConfig(TypedDict):
    id: PersonaId
    displayName: str
    description: str
    meta: PersonaMeta
    behavior: PersonaBehavior
    llmPrompt: PersonaPromptConfig


PERSONAS_DIR = Path(__file__).with_name("persona_configs")


@lru_cache(maxsize=1)
def load_personas() -> Dict[PersonaId, PersonaConfig]:
    """Load personas from individual JSON files in persona_configs/ and cache the result."""
    if not PERSONAS_DIR.exists():
        raise FileNotFoundError(f"Personas directory not found at {PERSONAS_DIR}")

    personas: Dict[PersonaId, PersonaConfig] = {}
    for path in sorted(PERSONAS_DIR.glob("*.json")):
        with path.open("r", encoding="utf-8") as f:
            data: Dict[str, Any] = json.load(f)
        persona_id = data.get("id")
        if not persona_id:
            continue
        personas[persona_id] = data  # type: ignore[assignment]

    if not personas:
        raise ValueError(f"No persona JSON files found in {PERSONAS_DIR}")

    return personas


def get_persona(persona_id: PersonaId) -> PersonaConfig:
    personas = load_personas()
    try:
        return personas[persona_id]
    except KeyError as exc:
        raise KeyError(f"Unknown persona id: {persona_id}") from exc


@dataclass
class LlmPersonaPrompt:
    persona_id: PersonaId
    display_name: str
    system_prompt: str
    behavioral_rules: List[str]

    def to_messages(self, task_description: str) -> List[Dict[str, str]]:
        """Build a minimal OpenAI-style message list for this persona."""
        rules_block = "\n".join(f"- {rule}" for rule in self.behavioral_rules)

        system_message = {
            "role": "system",
            "content": f"{self.system_prompt}\n\nBehavioral rules:\n{rules_block}",
        }
        user_message = {
            "role": "user",
            "content": (
                f'Act as the persona "{self.display_name}" (id: {self.persona_id}).\n\n'
                "You are controlling a browser via actions like 'click', 'type', "
                "'wait', and 'navigate'. Think step-by-step and explain each action "
                "briefly in the voice of this persona.\n\n"
                f"High-level task for this run:\n{task_description.strip()}"
            ),
        }
        return [system_message, user_message]


def build_llm_persona_prompt(persona_id: PersonaId) -> LlmPersonaPrompt:
    persona = get_persona(persona_id)
    llm_prompt = persona["llmPrompt"]

    return LlmPersonaPrompt(
        persona_id=persona["id"],
        display_name=persona["displayName"],
        system_prompt=llm_prompt["system"],
        behavioral_rules=list(llm_prompt.get("behavioralRules", [])),
    )



