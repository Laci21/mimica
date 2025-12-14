import asyncio
import datetime
from typing import Any
import uuid
from agents import Agent, RunConfig, RunContextWrapper, Runner, function_tool
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

from src.data_models import TKFUpdate
from src.tkf_store import tkf
from src.event_listener import EventListener
from src.utils import call_llm, llm_gpt_4o

INSTRUCTIONS = f"""
Your are a knowledge base editor agent. You are responsible for updating the knowledge base with the given information.
You will be given new information to update the knowledge base.
Perform the following steps:
- Check the new information against the current TKF content and decide if it should be added to the TKF or not
- In case of conflict between the new information and the current TKF, ALWAYS rely on the current TKF content.
- Update the TKF with the given information using the 'update_tkf' tool

Important rules for update_tkf:
- The 'new_text' parameter should contain ONLY the new knowledge you want to add (not the entire TKF)
- The 'old_text' parameter should be empty ("") unless you are explicitly replacing existing text
- The store will automatically append new content, check for semantic duplicates, and detect conflicts

If the user EXPLICITLY asks, you may also show the current TKF content, call 'get_tkf' tool.
NEVER ask clarifying questions to the user. ONLY use the tools to do the task.
"""


async def _is_duplicate_content(new_text: str, existing_content: str) -> bool:
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
    print(f"[TKF] Checking for semantic duplicates...")
    response = await call_llm("tkf_duplicate_checker", instructions, prompt)
    result = "true" in response.lower()
    if result:
        print(f"[TKF] Semantic duplicate detected")
        return True
    else:
        print(f"[TKF] No semantic duplicate detected")
        return False

async def _has_conflictig_content(new_text: str, existing_content: str) -> bool:
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
    print(f"[TKF] Checking for conflicts with existing knowledge...")
    response = await call_llm("tkf_conflict_checker", instructions, prompt)
    result = "true" in response.lower()
    if result:
        print(f"[TKF] Conflict detected")
        return True
    else:
        print(f"[TKF] No conflict detected")
        return False

@function_tool
async def get_tkf(context: RunContextWrapper[Any]):
    """
    Get the TKF with the given information.
    """
    return await tkf.get_full_content()

@function_tool
async def update_tkf(context: RunContextWrapper[Any], new_text: str, reasoning: str, old_text: str = ""):
    """
    Update the TKF with the given information.
    The store will automatically append new content and check for duplicates.
    If will skip the update if the new knowledge is a duplicate or conflicts with existing knowledge.
    
    Parameters:
    - new_text: str - The new knowledge text to add or use as replacement. Must be non-empty.
    - reasoning: str - The reasoning explaining why this knowledge should be added. Must be non-empty.
    - old_text: str - Optional. The old text to be replaced by new_text. Leave empty ("") to append new knowledge.
    
    Returns:
    - True if the TKF is updated, False otherwise.
    """
    content = await tkf.get_full_content()
    is_duplicate_task = _is_duplicate_content(new_text, content)
    has_conflict_task = _has_conflictig_content(new_text, content)
    is_duplicate, has_conflict = await asyncio.gather(is_duplicate_task, has_conflict_task)
    if is_duplicate or has_conflict:
        print(f"[TKF] Skipping update: {is_duplicate=} {has_conflict=}")
        return False

    update = TKFUpdate(
        id=str(uuid.uuid4()),
        created_at=datetime.datetime.now().isoformat(),
        old_text=old_text,
        new_text=new_text,
        reasoning=reasoning,
        metadata={},
    )
    await tkf.add_update(update)
    return True

def get_tkf_agent(tkf_content: str | None = None):
    instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n\n{INSTRUCTIONS}"
    if tkf_content is not None:
        instructions += f"\n\nCurrent TKF content:\n{tkf_content}"

    return Agent(
        name="tkf_agent",
        instructions=instructions,
        model=llm_gpt_4o,
        hooks=EventListener(),
        tools=[update_tkf],
    )


class TKFAgent:
    def __init__(self):
        self.tkf_store = tkf

    async def run(self, knowledge: str):
        tkf_content = await self.tkf_store.get_full_content()
        agent = get_tkf_agent(tkf_content)
        result = await Runner.run(
            agent, 
            input=knowledge, 
            run_config=RunConfig(tracing_disabled=False),
        )
        return result.final_output