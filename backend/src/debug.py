
from hashlib import sha256
import uuid
import httpx
import asyncio
from agents import Agent, RunConfig, Runner
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from langfuse import propagate_attributes
from event_listener import EventListener
from tracking import init_tracing
from utils import llm_gpt_4o


INSTRUCTIONS = f"""
You helpful assistant that can answer questions about the user's request.
"""



agent = Agent(
            name='debug_agent',
            instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n\n{INSTRUCTIONS}",
            model=llm_gpt_4o,
            hooks=EventListener(),
        )


async def start_chat_loop():
    with propagate_attributes(
            session_id=str(uuid.uuid4()), 
            tags=["debug_agent"], 
            metadata={
                "agent_name": agent.name
            }
        ):
        while True:
            user_input = input("[User]: ")
            if user_input.strip().lower() in {"exit", "quit", "bye", "bb", "q"}:
                break
            result = await Runner.run(agent, input=user_input, run_config=RunConfig(tracing_disabled=False))
            print(result.final_output)

async def main():

    init_tracing()
    await start_chat_loop()

if __name__ == "__main__":
    asyncio.run(main())