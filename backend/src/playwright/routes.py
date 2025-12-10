"""
FastAPI routes for Playwright UX testing endpoints.
"""

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .models import RunMode, UIVersion, PersonaFlowResult
from .gen_z_creator_v1 import run_gen_z_creator_v1
from .ai_ux_agent_v1 import run_ai_ux_agent_v1
from .ai_ux_agent_v1_plan import run_ai_ux_agent_v1_plan
from .ai_ux_agent_v1_fullplan import run_ai_ux_agent_v1_fullplan
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR


# Pydantic models for request/response
class StartRunRequest(BaseModel):
    """Request to start a Playwright run"""
    persona_id: str
    scenario_id: str
    ui_version: UIVersion
    mode: RunMode
    headless: bool = True
    max_steps: Optional[int] = 20
    planning_strategy: str = "per-screen"  # "per-screen" or "full-flow"


class StartRunResponse(BaseModel):
    """Response after starting a run"""
    run_id: str
    status: str
    message: str


class RunStatusResponse(BaseModel):
    """Response for run status query"""
    run_id: str
    status: str
    metadata: dict


# Create router
router = APIRouter(prefix="/playwright", tags=["playwright"])


# Store active runs in memory (in production, use Redis or DB)
active_runs: dict[str, PersonaFlowResult] = {}


async def _execute_run(
    persona_id: str,
    scenario_id: str,
    ui_version: UIVersion,
    mode: RunMode,
    headless: bool,
    max_steps: int,
    planning_strategy: str = "per-screen"
):
    """
    Background task to execute a Playwright run.
    """
    try:
        if mode == RunMode.SCRIPTED:
            if persona_id == "gen-z-creator" and scenario_id == "onboarding":
                result = await run_gen_z_creator_v1(
                    headless=headless,
                    base_url=APP_BASE_URL,
                    output_dir=PLAYWRIGHT_OUTPUT_DIR
                )
            else:
                raise ValueError(f"Unsupported scripted persona/scenario: {persona_id}/{scenario_id}")
        
        elif mode == RunMode.LLM_DRIVEN:
            if persona_id == "ai-ux-agent" and scenario_id == "onboarding":
                # Choose planning strategy
                
                if planning_strategy == "full-flow":
                    # Full-flow planning: 1 LLM call for entire flow (fastest, ~10-20s)
                    result = await run_ai_ux_agent_v1_fullplan(
                        headless=headless,
                        base_url=APP_BASE_URL,
                        output_dir=PLAYWRIGHT_OUTPUT_DIR,
                        max_actions=max_steps
                    )
                elif planning_strategy == "per-step":
                    # Per-step planning: 1 LLM call per action (legacy, ~3-6 min)
                    result = await run_ai_ux_agent_v1(
                        headless=headless,
                        base_url=APP_BASE_URL,
                        output_dir=PLAYWRIGHT_OUTPUT_DIR,
                        max_steps=max_steps
                    )
                else:
                    # Per-screen planning: 1 LLM call per screen (default, ~30-60s)
                    result = await run_ai_ux_agent_v1_plan(
                        headless=headless,
                        base_url=APP_BASE_URL,
                        output_dir=PLAYWRIGHT_OUTPUT_DIR,
                        max_screens=max_steps
                    )
            else:
                raise ValueError(f"Unsupported LLM persona/scenario: {persona_id}/{scenario_id}")
        
        else:
            raise ValueError(f"Unsupported mode: {mode}")
        
        # Store result
        active_runs[result.run_id] = result
    
    except Exception as e:
        print(f"Error in background run: {e}")
        # Store error result
        error_result = PersonaFlowResult(
            run_id=f"error-{persona_id}",
            success=False,
            event_count=0,
            duration_ms=0,
            error=str(e)
        )
        active_runs[error_result.run_id] = error_result


@router.post("/runs", response_model=StartRunResponse)
async def start_run(
    request: StartRunRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new Playwright run for a persona.
    
    The run executes in the background and returns immediately with a run ID.
    Use GET /playwright/runs/{run_id} to check status.
    """
    # Generate a temporary run ID for tracking
    temp_run_id = f"pending-{request.persona_id}-{request.mode.value}"
    
    # Start the run in background
    background_tasks.add_task(
        _execute_run,
        persona_id=request.persona_id,
        scenario_id=request.scenario_id,
        ui_version=request.ui_version,
        mode=request.mode,
        headless=request.headless,
        max_steps=request.max_steps or 20,
        planning_strategy=request.planning_strategy
    )
    
    return StartRunResponse(
        run_id=temp_run_id,
        status="started",
        message=f"Run started in background. Poll /playwright/runs/{{run_id}} for status."
    )


@router.get("/runs")
async def list_runs():
    """
    List all completed runs.
    """
    output_dir = Path(PLAYWRIGHT_OUTPUT_DIR)
    if not output_dir.exists():
        return {"runs": []}
    
    runs = []
    for run_dir in output_dir.iterdir():
        if run_dir.is_dir() and run_dir.name.startswith("run"):
            metadata_path = run_dir / "metadata.json"
            if metadata_path.exists():
                with open(metadata_path) as f:
                    metadata = json.load(f)
                    runs.append({
                        "run_id": metadata.get("run_id"),
                        "persona_id": metadata.get("persona_id"),
                        "mode": metadata.get("mode"),
                        "status": metadata.get("status"),
                        "started_at": metadata.get("started_at"),
                        "duration_ms": metadata.get("duration_ms")
                    })
    
    # Sort by started_at descending
    runs.sort(key=lambda x: x.get("started_at", ""), reverse=True)
    
    return {"runs": runs}


@router.get("/runs/{run_id}")
async def get_run_metadata(run_id: str):
    """
    Get metadata for a specific run.
    """
    # Check if run is in active runs
    if run_id in active_runs:
        result = active_runs[run_id]
        return {
            "run_id": result.run_id,
            "success": result.success,
            "event_count": result.event_count,
            "duration_ms": result.duration_ms,
            "video_path": result.video_path,
            "error": result.error
        }
    
    # Otherwise, check filesystem
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    metadata_path = run_dir / "metadata.json"
    
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    
    with open(metadata_path) as f:
        metadata = json.load(f)
    
    return metadata


@router.get("/runs/{run_id}/events")
async def get_run_events(run_id: str):
    """
    Get events for a specific run.
    """
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    events_path = run_dir / "events.json"
    
    if not events_path.exists():
        raise HTTPException(status_code=404, detail=f"Events for run {run_id} not found")
    
    with open(events_path) as f:
        events = json.load(f)
    
    return {"run_id": run_id, "events": events}


@router.get("/runs/{run_id}/video")
async def get_run_video(run_id: str):
    """
    Download video for a specific run.
    """
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    video_path = run_dir / "video.webm"
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video for run {run_id} not found")
    
    return FileResponse(
        path=str(video_path),
        media_type="video/webm",
        filename=f"{run_id}-video.webm"
    )


@router.get("/runs/{run_id}/trace")
async def get_run_trace(run_id: str):
    """
    Download Playwright trace for a specific run.
    """
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    trace_path = run_dir / "trace.zip"
    
    if not trace_path.exists():
        raise HTTPException(status_code=404, detail=f"Trace for run {run_id} not found")
    
    return FileResponse(
        path=str(trace_path),
        media_type="application/zip",
        filename=f"{run_id}-trace.zip"
    )


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    """
    Delete a run and all its artifacts.
    """
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    
    # Delete directory and contents
    import shutil
    shutil.rmtree(run_dir)
    
    # Remove from active runs if present
    if run_id in active_runs:
        del active_runs[run_id]
    
    return {"message": f"Run {run_id} deleted successfully"}

