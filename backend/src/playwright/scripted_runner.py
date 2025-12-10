"""
Generic scripted Playwright flow runner that loads scripts from JSON files.

This runner can execute any persona's scripted flow by loading the appropriate
JSON file from backend/playwright-scripts/{ui_version}/{persona_id}.json

Outputs:
- Video recording
- Playwright trace
- events.json (custom event log)
- metadata.json (run metadata)
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    PlaywrightAction,
    EventStatus,
    PlaywrightEvent,
    PlaywrightRunMetadata,
    UIVersion,
    RunMode,
    RunStatus,
    PersonaFlowResult,
)
from .runner_core import PlaywrightRunner
from .logger import EventLogger
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR


def load_scripted_flow(persona_id: str, ui_version: str, scripts_dir: str = "playwright-scripts") -> dict:
    """
    Load a scripted flow JSON file for a given persona and UI version.
    
    Args:
        persona_id: The persona identifier
        ui_version: The UI version (e.g., 'v1', 'v2')
        scripts_dir: Directory containing script files (relative to backend/)
    
    Returns:
        Dictionary containing the scripted flow data
    
    Raises:
        FileNotFoundError: If the script file doesn't exist
        ValueError: If the script file is invalid
    """
    # Get the backend directory (parent of src)
    backend_dir = Path(__file__).parent.parent.parent
    script_path = backend_dir / scripts_dir / ui_version / f"{persona_id}.json"
    
    if not script_path.exists():
        raise FileNotFoundError(
            f"Scripted flow not found for persona '{persona_id}' and UI version '{ui_version}' at {script_path}"
        )
    
    with open(script_path, 'r') as f:
        script_data = json.load(f)
    
    # Validate basic structure
    if 'steps' not in script_data:
        raise ValueError(f"Invalid script file: missing 'steps' field")
    
    if not isinstance(script_data['steps'], list):
        raise ValueError(f"Invalid script file: 'steps' must be a list")
    
    return script_data


async def run_scripted_flow(
    persona_id: str,
    ui_version: UIVersion,
    headless: bool = True,
    base_url: Optional[str] = None,
    output_dir: Optional[str] = None,
    run_id: Optional[str] = None
) -> PersonaFlowResult:
    """
    Run a scripted flow for any persona by loading the appropriate JSON script.
    
    Args:
        persona_id: The persona identifier (e.g., 'accessibility_screen_reader')
        ui_version: The UI version to test
        headless: Whether to run browser in headless mode
        base_url: Base URL of the app (defaults to APP_BASE_URL)
        output_dir: Output directory for artifacts (defaults to PLAYWRIGHT_OUTPUT_DIR)
        run_id: Optional run ID (generated if not provided)
    
    Returns:
        PersonaFlowResult with paths to artifacts
    """
    # Load the scripted flow
    try:
        script_data = load_scripted_flow(persona_id, ui_version.value)
    except FileNotFoundError as e:
        raise ValueError(f"No scripted flow available for persona '{persona_id}' on UI version '{ui_version.value}'") from e
    
    # Setup
    if run_id is None:
        run_id = f"run-{persona_id}-{int(time.time() * 1000)}"
    
    scenario_id = script_data.get('scenario_id', 'onboarding')
    persona_name = script_data.get('persona_name', persona_id)
    
    base_url = base_url or APP_BASE_URL
    output_dir = output_dir or PLAYWRIGHT_OUTPUT_DIR
    
    start_time = time.time()
    started_at = datetime.utcnow().isoformat()
    
    print(f"\n🎭 Starting scripted run: {run_id}")
    print(f"   Persona: {persona_name} ({persona_id})")
    print(f"   UI Version: {ui_version.value}")
    print(f"   Mode: SCRIPTED")
    print(f"   Headless: {headless}")
    print(f"   Steps: {len(script_data['steps'])}\n")
    
    # Initialize metadata
    metadata = PlaywrightRunMetadata(
        run_id=run_id,
        persona_id=persona_id,
        scenario_id=scenario_id,
        ui_version=ui_version,
        mode=RunMode.SCRIPTED,
        app_url=f"{base_url}/app?version={ui_version.value}",
        status=RunStatus.RUNNING,
        started_at=started_at,
        metadata={
            "browser": "chromium",
            "headless": headless,
            "script_file": f"{ui_version.value}/{persona_id}.json",
            "total_steps": len(script_data['steps'])
        }
    )
    
    # Initialize logger
    logger = EventLogger(metadata, output_dir)
    
    # Initialize runner
    runner = PlaywrightRunner(
        base_url=base_url,
        headless=headless,
        record_video=True,
        capture_trace=True,
        output_dir=output_dir,
        run_id=run_id
    )
    
    step_index = 0
    error: Optional[str] = None
    
    try:
        # Start Playwright
        page = await runner.start()
        
        # Navigate to app
        await runner.navigate(f"/app?version={ui_version.value}")
        await asyncio.sleep(1.5)  # Wait for initial load
        
        # Execute each step from the script
        for step_data in script_data['steps']:
            # Parse action
            action_str = step_data.get('action', 'WAIT').upper()
            try:
                action = PlaywrightAction[action_str]
            except KeyError:
                print(f"Warning: Unknown action '{action_str}', defaulting to WAIT")
                action = PlaywrightAction.WAIT
            
            # Parse status
            status_str = step_data.get('status', 'success').upper()
            try:
                status = EventStatus[status_str]
            except KeyError:
                print(f"Warning: Unknown status '{status_str}', defaulting to SUCCESS")
                status = EventStatus.SUCCESS
            
            # Extract step details
            selector = step_data.get('selector', 'body')
            reasoning = step_data.get('reasoning', '')
            screen_id = step_data.get('screen_id', 'unknown')
            wait_after_ms = step_data.get('wait_after_ms', 1000)
            text_to_type = step_data.get('text_to_type')
            
            # Extract element ID from selector if available
            target_element_id = None
            if 'data-element-id=' in selector:
                # Extract ID from selector like [data-element-id="step0-continue"]
                start = selector.find('data-element-id="') + len('data-element-id="')
                end = selector.find('"', start)
                if end > start:
                    target_element_id = selector[start:end]
            
            # Log the event
            logger.log_event(PlaywrightEvent(
                run_id=run_id,
                persona_id=persona_id,
                step_index=step_index,
                screen_id=screen_id,
                target_selector=selector,
                target_element_id=target_element_id,
                action=action,
                reasoning_text=reasoning,
                status=status,
                timestamp=time.time()
            ))
            
            # Execute the action
            try:
                if action == PlaywrightAction.CLICK:
                    await page.click(selector, timeout=5000)
                    print(f"  ✓ Step {step_index + 1}: CLICK {target_element_id or selector}")
                
                elif action == PlaywrightAction.HOVER:
                    await page.hover(selector, timeout=5000)
                    print(f"  ✓ Step {step_index + 1}: HOVER {target_element_id or selector}")
                
                elif action == PlaywrightAction.TYPE:
                    if text_to_type:
                        await page.fill(selector, text_to_type, timeout=5000)
                        print(f"  ✓ Step {step_index + 1}: TYPE '{text_to_type}' into {target_element_id or selector}")
                    else:
                        print(f"  ⚠ Step {step_index + 1}: TYPE action missing text_to_type")
                
                elif action == PlaywrightAction.WAIT:
                    print(f"  ✓ Step {step_index + 1}: WAIT ({reasoning[:50]}...)")
                
                else:
                    print(f"  ⚠ Step {step_index + 1}: Unsupported action {action}")
            
            except Exception as e:
                print(f"  ✗ Step {step_index + 1}: Failed - {e}")
                # Continue with next step even if this one fails
            
            # Wait after action
            await asyncio.sleep(wait_after_ms / 1000.0)
            step_index += 1
        
        # Mark as completed
        metadata.status = RunStatus.COMPLETED
        duration_ms = int((time.time() - start_time) * 1000)
        metadata.completed_at = datetime.utcnow().isoformat()
        metadata.duration_ms = duration_ms
        
        print(f"\n✅ Run completed successfully!")
        print(f"   Duration: {duration_ms / 1000:.1f}s")
        print(f"   Steps executed: {step_index}")
    
    except Exception as e:
        error = str(e)
        print(f"\n❌ Run failed: {error}")
        metadata.status = RunStatus.FAILED
        metadata.completed_at = datetime.utcnow().isoformat()
        metadata.duration_ms = int((time.time() - start_time) * 1000)
    
    finally:
        # Stop runner and save artifacts
        video_path, trace_path = await runner.stop()
        
        # Save metadata and events
        events_path = logger.save_events()
        metadata_path = logger.save_metadata(metadata)
        
        # Update metadata with artifact paths
        metadata.video_path = str(video_path) if video_path else None
        metadata.trace_path = str(trace_path) if trace_path else None
        metadata.events_path = str(events_path)
        metadata.metadata_path = str(metadata_path)
        
        # Re-save metadata with updated paths
        logger.save_metadata(metadata)
    
    # Return result
    return PersonaFlowResult(
        run_id=run_id,
        success=(metadata.status == RunStatus.COMPLETED),
        event_count=step_index,
        duration_ms=metadata.duration_ms or 0,
        video_path=metadata.video_path,
        trace_path=metadata.trace_path,
        events_path=metadata.events_path,
        metadata_path=metadata.metadata_path,
        error=error
    )
