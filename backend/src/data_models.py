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
