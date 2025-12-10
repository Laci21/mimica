import os
from dotenv import load_dotenv


load_dotenv()


OPENAI_API_ENDPOINT_GPT_4O = os.getenv("OPENAI_API_ENDPOINT_GPT_4O")
OPENAI_API_KEY_GPT_4O = os.getenv("OPENAI_API_KEY_GPT_4O")

if OPENAI_API_ENDPOINT_GPT_4O is None:
    raise ValueError("OPENAI_API_ENDPOINT_GPT_4O must be set")

if OPENAI_API_KEY_GPT_4O is None:
    raise ValueError("OPENAI_API_KEY_GPT_4O must be set")

LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_BASE_URL = os.getenv("LANGFUSE_BASE_URL")