from contextlib import contextmanager
from contextlib import contextmanager
from langfuse import get_client
from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor
from config import LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY


LANGFUSE_ENABLED = LANGFUSE_SECRET_KEY is not None and LANGFUSE_PUBLIC_KEY is not None and LANGFUSE_BASE_URL is not None and LANGFUSE_BASE_URL.strip() != ''

if LANGFUSE_ENABLED:
    # Real implementations
    from langfuse import observe, propagate_attributes
else:
    # No-op decorator
    def observe(*dargs, **dkwargs):
        def decorator(func):
            return func
        return decorator

    # No-op context manager
    @contextmanager
    def propagate_attributes(*args, **kwargs):
        yield


def init_tracing():
    # Import langfuse.openai to enable proper tracing integration.
    # This import is required for tracking to work, even if unused directly.
    if LANGFUSE_BASE_URL is not None and LANGFUSE_BASE_URL.strip() != "": # Note: importing langfuse.openai when turning Langfuse off generates log errors: `Failed to export span batch code: 401, reason: {"message":"Invalid credentials. Confirm that you've configured the correct host."}`
        import langfuse.openai
    OpenAIAgentsInstrumentor().instrument()
    _init_langfuse_tracing()

def _init_langfuse_tracing():

    print(f"LANGFUSE_SECRET_KEY: {LANGFUSE_SECRET_KEY[:10]+'...' if LANGFUSE_SECRET_KEY else 'None'}")
    print(f"LANGFUSE_PUBLIC_KEY: {LANGFUSE_PUBLIC_KEY[:10]+'...' if LANGFUSE_PUBLIC_KEY else 'None'}")
    print(f"LANGFUSE_BASE_URL: {LANGFUSE_BASE_URL if LANGFUSE_BASE_URL else 'None'}")
    if LANGFUSE_ENABLED:
        langfuse = get_client()
        if langfuse.auth_check():
            print(f"ℹ️  Using Langfuse tracing: {LANGFUSE_BASE_URL}")
        else:
            print("❌  Langfuse authentication failed. Please check your credentials and host.")
    else:
        print("⚠️  Langfuse tracing is DISABLED")


__all__ = ["init_tracing", "observe", "propagate_attributes"]
