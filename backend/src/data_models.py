import datetime
import uuid
from pydantic import BaseModel, Field

class PersonMeta(BaseModel):
    version: int = Field(description="The version of the persona")
    author: str = Field(description="The author of the persona")
    created_at: str = Field(description="The creation date of the persona", alias="createdAt")
    tags: list[str] = Field(description="The tags of the persona")

class Persona(BaseModel):
    id: str = Field(description="The unique identifier for the persona")
    display_name: str = Field(description="The name of the persona", alias="displayName")
    description: str = Field(description="The description of the persona")
    behavior: dict = Field(description="The behavior of the persona", default={})
    llm_prompt: dict = Field(description="The LLM prompt of the persona", alias="llmPrompt", default={})
    meta: PersonMeta = Field(description="The meta data of the persona")


class TestEvent(BaseModel):
    id: str = Field(description="The unique identifier for the event", default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(description="The unique identifier for the session")
    persona_id: str = Field(description="The unique identifier for the persona")
    group_id: str = Field(description="The unique identifier for the group")
    created_at: str = Field(description="The creation date of the event", default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    sentiment: str = Field(description="The sentiment of the event")
    screen_id: str = Field(description="The screen identifier for the event")
    reasoning_text: str = Field(description="The reasoning text for the event")
    action: str = Field(description="The action performed in the event")
    target_selector: str = Field(description="The target selector for the event")


class TKFUpdate(BaseModel):
    id: str = Field(description="The unique identifier for the knowledge item")
    created_at: str = Field(description="The creation date of the knowledge item", default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    old_text: str = Field(description="The old text of the knowledge item, to be replaced by the new text")
    new_text: str = Field(description="The new text of the knowledge item, replacing the old text")
    reasoning: str = Field(description="The reasoning of the knowledge item")
    metadata: dict = Field(description="The metadata of the knowledge item", default={})
