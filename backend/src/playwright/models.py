"""
Data models for Playwright-driven persona runs.

Mirrors TypeScript types from lib/playwright/types.ts for consistency.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, Dict, Any, Literal
from datetime import datetime


class PlaywrightAction(str, Enum):
    """Action types that can be performed in Playwright tests"""
    CLICK = "CLICK"
    HOVER = "HOVER"
    TYPE = "TYPE"
    WAIT = "WAIT"
    NAVIGATE = "NAVIGATE"
    SELECT = "SELECT"
    SCROLL = "SCROLL"


class EventStatus(str, Enum):
    """Status of each step/event - matches SimulationStep status values"""
    SUCCESS = "success"
    CONFUSED = "confused"
    BLOCKED = "blocked"
    DELIGHTED = "delighted"


class RunMode(str, Enum):
    """Execution mode for the run"""
    SCRIPTED = "scripted"      # POC 1: Fixed sequence of actions
    LLM_DRIVEN = "llm-driven"  # POC 2: LLM decides actions dynamically


class UIVersion(str, Enum):
    """UI version being tested"""
    V1 = "v1"
    V2 = "v2"


class RunStatus(str, Enum):
    """Run status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PlaywrightEvent:
    """
    Individual event logged during a Playwright run.
    Maps to SimulationStep in existing codebase.
    """
    run_id: str
    persona_id: str
    step_index: int
    target_selector: str
    action: PlaywrightAction
    reasoning_text: str
    status: EventStatus
    timestamp: float  # Unix timestamp
    
    screen_id: Optional[str] = None
    target_element_id: Optional[str] = None
    duration_ms: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['action'] = self.action.value
        result['status'] = self.status.value
        return result


@dataclass
class PlaywrightRunMetadata:
    """Metadata for a complete Playwright run"""
    run_id: str
    persona_id: str
    scenario_id: str
    ui_version: UIVersion
    mode: RunMode
    app_url: str
    status: RunStatus
    started_at: str  # ISO timestamp
    source: Literal["playwright-python"] = "playwright-python"
    
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None
    video_path: Optional[str] = None
    trace_path: Optional[str] = None
    events_path: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['ui_version'] = self.ui_version.value
        result['mode'] = self.mode.value
        result['status'] = self.status.value
        return result


@dataclass
class LLMDecision:
    """Decision made by LLM for next action"""
    action: PlaywrightAction
    selector: str
    reasoning: str
    should_continue: bool
    
    text_to_type: Optional[str] = None
    status: EventStatus = EventStatus.SUCCESS
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = asdict(self)
        result['action'] = self.action.value
        result['status'] = self.status.value
        return result


@dataclass
class PageState:
    """Page state information passed to LLM for decision-making"""
    title: str
    url: str
    visible_text: str
    available_elements: list[Dict[str, str]]
    screen_id: Optional[str] = None


@dataclass
class PersonaFlowConfig:
    """Configuration for running a persona flow"""
    persona_id: str
    scenario_id: str
    ui_version: UIVersion
    app_url: str
    mode: RunMode
    
    max_steps: int = 20
    action_timeout: int = 30000  # 30 seconds
    record_video: bool = True
    capture_trace: bool = True
    output_dir: str = "playwright-runs"
    headless: bool = True
    
    llm_config: Optional[Dict[str, Any]] = None


@dataclass
class PersonaFlowResult:
    """Result of running a persona flow"""
    run_id: str
    success: bool
    event_count: int
    duration_ms: int
    
    video_path: Optional[str] = None
    trace_path: Optional[str] = None
    events_path: Optional[str] = None
    metadata_path: Optional[str] = None
    error: Optional[str] = None


# ============================================================================
# Plan-Then-Execute Models
# ============================================================================

@dataclass
class PlanAction:
    """
    A single planned action for plan-then-execute flow.
    
    Each action includes reasoning so we can populate TKF and thought bubbles.
    """
    action: PlaywrightAction
    selector: str
    reasoning: str
    value: Optional[str] = None  # Text to type, if action is TYPE
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['action'] = self.action.value
        return result


@dataclass
class ScreenPlan:
    """
    A plan for a single screen/segment of the flow.
    
    Contains an ordered list of actions to execute on this screen.
    """
    screen_id: str
    actions: list[PlanAction]
    stop_condition: Optional[str] = None  # Future: "when continue button is enabled"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'screen_id': self.screen_id,
            'actions': [a.to_dict() for a in self.actions],
            'stop_condition': self.stop_condition
        }


@dataclass
class ScreenSummary:
    """
    Summary of current screen state for planner input.
    """
    screen_id: str
    title: str
    url: str
    available_elements: list[Dict[str, str]]  # [{id, label, type}, ...]


@dataclass
class FullFlowPlan:
    """
    A plan for the entire flow (all screens).
    
    Contains an ordered list of actions across all screens.
    """
    flow_id: str
    actions: list[PlanAction]
    expected_screens: list[str]  # Expected screen progression
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'flow_id': self.flow_id,
            'actions': [a.to_dict() for a in self.actions],
            'expected_screens': self.expected_screens
        }

