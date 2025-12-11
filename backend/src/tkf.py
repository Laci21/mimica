import datetime
from typing import Any
import uuid
from agents import Agent, RunContextWrapper, function_tool
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

from src.data_models import TKFUpdate
from src.tkf_store import tkf
from src.event_listener import EventListener
from src.utils import llm_gpt_4o

INSTRUCTIONS = f"""
Your are a knowledge base editor agent. You are responsible for updating the knowledge base with the given information.
You will be given new information to update the knowledge base.
Perform the following steps:
- Get the current TKF using the 'get_tkf' tool (full_content: str)
- Check the new information against the current TKF and decide if it should be added to the TKF or not
- In case of conflict between the new information and the current TKF, ALWAYS rely on the current TKF content.
- Update the TKF with the given information using the 'update_tkf' tool

Important rules for update_tkf:
- The 'new_text' parameter should contain ONLY the new knowledge you want to add (not the entire TKF)
- The 'old_text' parameter should be empty ("") unless you are explicitly replacing existing text
- The store will automatically append new content, check for semantic duplicates, and detect conflicts

If the user EXPLICITLY asks, you may also show the current TKF content, call 'get_tkf' tool.
NEVER ask clarifying questions to the user. ONLY use the tools to do the task.
"""



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
    
    Parameters:
    - new_text: str - The new knowledge text to add or use as replacement. Must be non-empty.
    - reasoning: str - The reasoning explaining why this knowledge should be added. Must be non-empty.
    - old_text: str - Optional. The old text to be replaced by new_text. Leave empty ("") to append new knowledge.
    
    Returns:
    - TKFUpdate - The updated TKFUpdate object.
    """
    update = TKFUpdate(
        id=str(uuid.uuid4()),
        created_at=datetime.datetime.now().isoformat(),
        old_text=old_text,
        new_text=new_text,
        reasoning=reasoning,
        metadata={},
    )
    await tkf.add_update(update)
    return update

def get_tkf_agent():
    return Agent(
        name="tkf_agent",
        instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n\n{INSTRUCTIONS}",
        model=llm_gpt_4o,
        hooks=EventListener(),
        tools=[update_tkf, get_tkf],
    )

