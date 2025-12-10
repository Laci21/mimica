import os
from dotenv import load_dotenv


load_dotenv()


# Support both existing and new environment variable names
# Fallback to existing OPENAI_* variables if GPT_4O variants aren't set
OPENAI_API_ENDPOINT_GPT_4O = os.getenv("OPENAI_API_ENDPOINT_GPT_4O") or os.getenv("OPENAI_API_ENDPOINT")
OPENAI_API_KEY_GPT_4O = os.getenv("OPENAI_API_KEY_GPT_4O") or os.getenv("OPENAI_API_KEY")

if OPENAI_API_ENDPOINT_GPT_4O is None:
    raise ValueError("OPENAI_API_ENDPOINT_GPT_4O or OPENAI_API_ENDPOINT must be set")

if OPENAI_API_KEY_GPT_4O is None:
    raise ValueError("OPENAI_API_KEY_GPT_4O or OPENAI_API_KEY must be set")

LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_BASE_URL = os.getenv("LANGFUSE_BASE_URL")

# Playwright configuration
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")
PLAYWRIGHT_OUTPUT_DIR = os.getenv("PLAYWRIGHT_OUTPUT_DIR", "playwright-runs")