import agents
from agents.extensions.models.litellm_model import LitellmModel

from config import OPENAI_API_KEY_GPT_4O, OPENAI_API_ENDPOINT_GPT_4O

llm_gpt_4o = LitellmModel(model="gpt-4o", api_key=OPENAI_API_KEY_GPT_4O, base_url=OPENAI_API_ENDPOINT_GPT_4O)