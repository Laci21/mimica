"""
Pydantic models for JSON-driven scripted Playwright flows.

These models validate and parse JSON scripts that define persona test flows.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from .models import PlaywrightAction, EventStatus


class ScriptedStep(BaseModel):
    """A single step in a scripted flow."""
    screen_id: str = Field(..., description="Screen identifier (e.g., step-0)")
    action: PlaywrightAction = Field(..., description="Action to perform")
    selector: str = Field(..., description="CSS selector (typically [data-element-id='...'])")
    value: Optional[str] = Field(None, description="Value for TYPE actions")
    reasoning: str = Field(..., description="First-person narrative text for thought bubbles")
    status: EventStatus = Field(EventStatus.SUCCESS, description="Event status")
    wait_before_ms: int = Field(0, description="Milliseconds to wait before this step")
    wait_after_ms: int = Field(1000, description="Milliseconds to wait after this step")
    
    @validator('reasoning')
    def reasoning_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('reasoning must be non-empty')
        return v
    
    @validator('wait_before_ms', 'wait_after_ms')
    def wait_positive(cls, v):
        if v < 0:
            raise ValueError('wait times must be non-negative')
        return v


class ScriptedFlow(BaseModel):
    """Complete scripted flow definition for a persona."""
    persona_id: str = Field(..., description="Unique persona identifier")
    persona_name: str = Field(..., description="Human-readable persona name")
    ui_version: str = Field(..., description="UI version (v1 or v2)")
    scenario_id: str = Field(..., description="Scenario being tested (e.g., onboarding)")
    description: str = Field(..., description="Brief description of this test run")
    steps: List[ScriptedStep] = Field(..., description="Array of steps to execute")
    
    @validator('ui_version')
    def validate_ui_version(cls, v):
        if v not in ['v1', 'v2']:
            raise ValueError('ui_version must be v1 or v2')
        return v
    
    @validator('steps')
    def steps_not_empty(cls, v):
        if not v:
            raise ValueError('steps must contain at least one step')
        return v
    
    class Config:
        use_enum_values = False  # Keep enum objects, don't convert to strings

