import agents
from agents import Agent, RunConfig, Runner
from agents.extensions.models.litellm_model import LitellmModel

from src.config import OPENAI_API_KEY_GPT_4O, OPENAI_API_ENDPOINT_GPT_4O

# Use gpt-4o-mini for faster responses (5-10x faster than gpt-4o)
llm_gpt_4o = LitellmModel(model="gpt-4o-mini", api_key=OPENAI_API_KEY_GPT_4O, base_url=OPENAI_API_ENDPOINT_GPT_4O)

async def call_llm(name: str, instructions: str, prompt: str) -> str:
    """
    Shared utility to call LLM with the given name, instructions, and prompt.
    Uses gpt-4o-mini model with tracing disabled for internal operations.
    """
    agent = Agent(
        name=name,
        instructions=instructions,
        model=llm_gpt_4o,
    )
    
    result = await Runner.run(
        agent,
        input=prompt,
        run_config=RunConfig(tracing_disabled=True)
    )
    
    return result.final_output
