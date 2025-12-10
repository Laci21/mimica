"""
FastAPI routes for Playwright UX testing endpoints.
"""

import json
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .models import RunMode, UIVersion, PersonaFlowResult
from .scripted_runner import run_scripted_flow
from .ai_ux_agent_v1 import run_ai_ux_agent_v1
from .ai_ux_agent_v1_plan import run_ai_ux_agent_v1_plan
from .ai_ux_agent_v1_fullplan import run_ai_ux_agent_v1_fullplan
from .batch_runner import run_persona_suite
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR
from src.persona_repository import repository as persona_repo


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
    run_id: str,
    persona_id: str,
    scenario_id: str,
    ui_version: UIVersion,
    mode: RunMode,
    headless: bool,
    max_steps: int,
    planning_strategy: str = "per-step"
):
    """
    Background task to execute a Playwright run.
    """
    # Store pending status immediately
    pending_result = PersonaFlowResult(
        run_id=run_id,
        success=False,
        event_count=0,
        duration_ms=0,
        error=None
    )
    active_runs[run_id] = pending_result
    
    try:
        if mode == RunMode.SCRIPTED:
            # Use generic scripted runner for any persona
            result = await run_scripted_flow(
                persona_id=persona_id,
                ui_version=ui_version,
                headless=headless,
                base_url=APP_BASE_URL,
                output_dir=PLAYWRIGHT_OUTPUT_DIR,
                run_id=run_id
            )
        
        elif mode == RunMode.LLM_DRIVEN:
            # Fetch persona from repository
            persona = persona_repo.get_by_id(persona_id)
            if persona is None:
                raise ValueError(f"Persona '{persona_id}' not found")
            
            # For now, only support onboarding scenario
            if scenario_id != "onboarding":
                raise ValueError(f"Unsupported scenario: {scenario_id}. Only 'onboarding' is supported.")
            
            # Choose planning strategy
            if planning_strategy == "full-flow":
                # Full-flow planning: 1 LLM call for entire flow (fastest, ~10-20s)
                result = await run_ai_ux_agent_v1_fullplan(
                    headless=headless,
                    base_url=APP_BASE_URL,
                    output_dir=PLAYWRIGHT_OUTPUT_DIR,
                    max_actions=max_steps,
                    persona=persona,
                    run_id=run_id
                )
            elif planning_strategy == "per-step":
                # Per-step planning: 1 LLM call per action (legacy, ~3-6 min)
                result = await run_ai_ux_agent_v1(
                    headless=headless,
                    base_url=APP_BASE_URL,
                    output_dir=PLAYWRIGHT_OUTPUT_DIR,
                    max_steps=max_steps,
                    persona=persona,
                    run_id=run_id
                )
            else:
                # Per-screen planning: 1 LLM call per screen (default, ~30-60s)
                result = await run_ai_ux_agent_v1_plan(
                    headless=headless,
                    base_url=APP_BASE_URL,
                    output_dir=PLAYWRIGHT_OUTPUT_DIR,
                    max_screens=max_steps,
                    persona=persona,
                    run_id=run_id
                )
        
        else:
            raise ValueError(f"Unsupported mode: {mode}")
        
        # Update result in active_runs (replaces pending status)
        active_runs[result.run_id] = result
        
        # Clean up from active_runs after a delay (metadata.json is now the source of truth)
        import asyncio
        await asyncio.sleep(2)
        if result.run_id in active_runs:
            del active_runs[result.run_id]
    
    except Exception as e:
        print(f"Error in background run: {e}")
        import traceback
        traceback.print_exc()
        
        # Store error result with the same run_id
        error_result = PersonaFlowResult(
            run_id=run_id,
            success=False,
            event_count=0,
            duration_ms=0,
            error=str(e)
        )
        active_runs[run_id] = error_result
        
        # Keep error in active_runs for longer so frontend can see it
        import asyncio
        await asyncio.sleep(10)
        if run_id in active_runs:
            del active_runs[run_id]


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
    import time
    
    # Generate the final run ID upfront so frontend and backend use the same ID
    run_id = f"run-{request.persona_id}-{int(time.time() * 1000)}"
    
    # Start the run in background
    background_tasks.add_task(
        _execute_run,
        run_id=run_id,
        persona_id=request.persona_id,
        scenario_id=request.scenario_id,
        ui_version=request.ui_version,
        mode=request.mode,
        headless=request.headless,
        max_steps=request.max_steps or 20,
        planning_strategy=request.planning_strategy
    )
    
    return StartRunResponse(
        run_id=run_id,
        status="started",
        message=f"Run started in background. Poll /playwright/runs/{run_id} for status."
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
    # First check filesystem (completed runs)
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    metadata_path = run_dir / "metadata.json"
    
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
        return metadata
    
    # If not on filesystem, check if it's an active/pending run
    if run_id in active_runs:
        result = active_runs[run_id]
        # Return a metadata-like structure for pending runs
        return {
            "run_id": result.run_id,
            "status": "running" if result.error is None else "failed",
            "success": result.success,
            "event_count": result.event_count,
            "duration_ms": result.duration_ms,
            "video_path": result.video_path,
            "error": result.error,
            "metadata": {
                "eventCount": result.event_count
            }
        }
    
    # Not found anywhere
    raise HTTPException(status_code=404, detail=f"Run {run_id} not found")


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
    Stream video for a specific run with proper headers for browser playback.
    """
    run_dir = Path(PLAYWRIGHT_OUTPUT_DIR) / run_id
    video_path = run_dir / "video.webm"
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video for run {run_id} not found")
    
    # Check if file is empty or corrupted
    if video_path.stat().st_size == 0:
        raise HTTPException(status_code=500, detail=f"Video file for run {run_id} is empty")
    
    return FileResponse(
        path=str(video_path),
        media_type="video/webm",
        filename=f"{run_id}-video.webm",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }
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


# ============================================================================
# Scripted Suite Endpoints
# ============================================================================

class ScriptedSuiteRequest(BaseModel):
    """Request to run a scripted persona suite"""
    ui_version: str
    persona_ids: Optional[List[str]] = None  # Defaults to all 5 personas
    run_group_id: Optional[str] = None  # Generated if not provided
    headless: bool = True


class ScriptedSuiteResponse(BaseModel):
    """Response from starting a scripted suite"""
    run_group_id: str
    ui_version: str
    persona_count: int
    message: str


@router.post("/scripted-suite", response_model=ScriptedSuiteResponse)
async def start_scripted_suite(
    request: ScriptedSuiteRequest,
    background_tasks: BackgroundTasks
):
    """
    Run a complete suite of scripted personas for a given UI version.
    
    This runs all personas sequentially with a shared run_group_id for easy grouping.
    Perfect for generating demo videos and events for all personas at once.
    """
    import time
    
    # Generate run_group_id if not provided
    run_group_id = request.run_group_id or f"suite-{request.ui_version}-{int(time.time() * 1000)}"
    
    # Start the suite in background
    background_tasks.add_task(
        run_persona_suite,
        ui_version=request.ui_version,
        persona_ids=request.persona_ids,
        run_group_id=run_group_id,
        headless=request.headless,
        base_url=APP_BASE_URL,
        output_dir=PLAYWRIGHT_OUTPUT_DIR
    )
    
    persona_count = len(request.persona_ids) if request.persona_ids else 5
    
    return ScriptedSuiteResponse(
        run_group_id=run_group_id,
        ui_version=request.ui_version,
        persona_count=persona_count,
        message=f"Started scripted suite for {persona_count} personas (UI: {request.ui_version})"
    )


@router.get("/scripted-suite/{run_group_id}")
async def get_suite_status(run_group_id: str):
    """
    Get status of all runs in a suite by run_group_id.
    
    Returns metadata for all persona runs that share this run_group_id.
    """
    suite_dir = Path(PLAYWRIGHT_OUTPUT_DIR)
    
    if not suite_dir.exists():
        raise HTTPException(status_code=404, detail="No runs found")
    
    # Find all runs with this run_group_id
    suite_runs = []
    
    for run_dir in suite_dir.iterdir():
        if not run_dir.is_dir():
            continue
        
        metadata_file = run_dir / "metadata.json"
        if not metadata_file.exists():
            continue
        
        try:
            import json
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            # Check if this run belongs to the suite
            if metadata.get("run_group_id") == run_group_id or metadata.get("metadata", {}).get("run_group_id") == run_group_id:
                suite_runs.append({
                    "run_id": metadata["run_id"],
                    "persona_id": metadata["persona_id"],
                    "status": metadata["status"],
                    "duration_ms": metadata.get("duration_ms"),
                    "event_count": metadata.get("metadata", {}).get("eventCount", 0)
                })
        except Exception as e:
            print(f"Error reading metadata for {run_dir}: {e}")
            continue
    
    if not suite_runs:
        raise HTTPException(status_code=404, detail=f"No runs found for suite {run_group_id}")
    
    # Calculate suite status
    total = len(suite_runs)
    completed = sum(1 for r in suite_runs if r["status"] == "completed")
    failed = sum(1 for r in suite_runs if r["status"] == "failed")
    running = sum(1 for r in suite_runs if r["status"] == "running")
    
    suite_status = "completed" if completed == total else ("running" if running > 0 else "partial")
    
    return {
        "run_group_id": run_group_id,
        "status": suite_status,
        "total_personas": total,
        "completed": completed,
        "failed": failed,
        "running": running,
        "runs": suite_runs
    }

