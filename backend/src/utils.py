import agents
from agents.extensions.models.litellm_model import LitellmModel

from src.config import OPENAI_API_KEY_GPT_4O, OPENAI_API_ENDPOINT_GPT_4O

# Use gpt-4o-mini for faster responses (5-10x faster than gpt-4o)
llm_gpt_4o = LitellmModel(model="gpt-4o-mini", api_key=OPENAI_API_KEY_GPT_4O, base_url=OPENAI_API_ENDPOINT_GPT_4O)
