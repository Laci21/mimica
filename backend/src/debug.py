
from hashlib import sha256
import uuid
import httpx
import asyncio
from agents import Agent, Runner
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
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
    while True:
        user_input = input("[User]: ")
        if user_input.strip().lower() in {"exit", "quit", "bye", "bb", "q"}:
            break
        result = await Runner.run(agent, input=user_input)
        print(result.final_output)

async def main():

    init_tracing()
    await start_chat_loop()

if __name__ == "__main__":
    asyncio.run(main())