"""
JSON-driven scripted Playwright runner for reliable persona testing.

This module loads JSON scripts and executes them using PlaywrightRunner,
producing video, trace, events.json, and metadata.json for each persona.
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from pydantic import ValidationError

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
from .script_models import ScriptedFlow, ScriptedStep
from .runner_core import PlaywrightRunner
from .logger import EventLogger
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR


def load_script(persona_id: str, ui_version: str, scripts_dir: Optional[Path] = None) -> ScriptedFlow:
    """
    Load and validate a JSON script for a given persona and UI version.
    
    Args:
        persona_id: Persona identifier (e.g., 'impatient_new_user')
        ui_version: UI version ('v1' or 'v2')
        scripts_dir: Optional custom scripts directory (defaults to backend/playwright-scripts)
    
    Returns:
        Validated ScriptedFlow object
    
    Raises:
        FileNotFoundError: If script file doesn't exist
        ValidationError: If script doesn't match schema
        JSONDecodeError: If script is not valid JSON
    """
    if scripts_dir is None:
        # Default to backend/playwright-scripts
        scripts_dir = Path(__file__).parent.parent.parent / "playwright-scripts"
    
    script_path = scripts_dir / ui_version / f"{persona_id}.json"
    
    if not script_path.exists():
        raise FileNotFoundError(
            f"Script not found: {script_path}\n"
            f"Expected location: playwright-scripts/{ui_version}/{persona_id}.json"
        )
    
    # Load JSON
    with open(script_path, 'r', encoding='utf-8') as f:
        script_data = json.load(f)
    
    # Validate against schema
    try:
        script = ScriptedFlow(**script_data)
    except ValidationError as e:
        raise ValidationError(f"Invalid script format in {script_path}: {e}")
    
    return script


async def run_scripted_persona(
    persona_id: str,
    ui_version: str,
    run_group_id: Optional[str] = None,
    headless: bool = True,
    base_url: Optional[str] = None,
    output_dir: Optional[str] = None,
    scripts_dir: Optional[Path] = None
) -> PersonaFlowResult:
    """
    Run a scripted persona flow from a JSON script.
    
    Args:
        persona_id: Persona identifier
        ui_version: UI version to test ('v1' or 'v2')
        run_group_id: Optional group ID to batch multiple persona runs
        headless: Whether to run browser in headless mode
        base_url: Base URL of the app
        output_dir: Output directory for artifacts
        scripts_dir: Optional custom scripts directory
    
    Returns:
        PersonaFlowResult with paths to artifacts
    """
    # Load and validate script
    print(f"\n📄 Loading script for {persona_id} (UI: {ui_version})")
    script = load_script(persona_id, ui_version, scripts_dir)
    print(f"✓ Script loaded: {script.description}")
    print(f"✓ Steps: {len(script.steps)}")
    
    # Setup
    run_id = f"run-{persona_id}-{int(time.time() * 1000)}"
    scenario_id = script.scenario_id
    mode = RunMode.SCRIPTED
    
    base_url = base_url or APP_BASE_URL
    output_dir = output_dir or PLAYWRIGHT_OUTPUT_DIR
    
    start_time = time.time()
    started_at = datetime.now(datetime.UTC).isoformat() if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat()
    
    print(f"\n🎬 Starting scripted run: {run_id}")
    print(f"   Persona: {script.persona_name} ({persona_id})")
    print(f"   UI Version: {ui_version}")
    print(f"   Scenario: {scenario_id}")
    if run_group_id:
        print(f"   Run Group: {run_group_id}")
    print(f"   Headless: {headless}\n")
    
    # Initialize metadata
    metadata = PlaywrightRunMetadata(
        run_id=run_id,
        persona_id=persona_id,
        scenario_id=scenario_id,
        ui_version=UIVersion.V1 if ui_version == 'v1' else UIVersion.V2,
        mode=mode,
        app_url=f"{base_url}/app?version={ui_version}",
        status=RunStatus.RUNNING,
        started_at=started_at,
        run_group_id=run_group_id,  # Store at top level for easy querying
        metadata={
            "browser": "chromium",
            "headless": headless,
            "persona_name": script.persona_name,
            "script_description": script.description,
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
        await runner.navigate(f"/app?version={ui_version}")
        
        # Log initial navigation
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="initial",
            target_selector='page',
            action=PlaywrightAction.NAVIGATE,
            reasoning_text=f'{script.persona_name} begins testing the {ui_version} onboarding flow.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        
        # Initial wait for page load
        await asyncio.sleep(2)
        
        # Execute script steps
        for script_step in script.steps:
            print(f"\n[Step {step_index}] {script_step.screen_id}: {script_step.action.value}")
            print(f"  Selector: {script_step.selector}")
            print(f"  Reasoning: \"{script_step.reasoning}\"")
            print(f"  Status: {script_step.status.value}")
            
            # Wait before step if specified
            if script_step.wait_before_ms > 0:
                await asyncio.sleep(script_step.wait_before_ms / 1000)
            
            # Extract target element ID
            target_element_id = None
            if 'data-element-id=' in script_step.selector:
                try:
                    target_element_id = script_step.selector.split('data-element-id="')[1].split('"')[0]
                except:
                    pass
            
            # Log the event
            logger.log_event(PlaywrightEvent(
                run_id=run_id,
                persona_id=persona_id,
                step_index=step_index,
                screen_id=script_step.screen_id,
                target_selector=script_step.selector,
                target_element_id=target_element_id,
                action=script_step.action,
                reasoning_text=script_step.reasoning,
                status=script_step.status,
                timestamp=time.time()
            ))
            step_index += 1
            
            # Execute the action
            try:
                if script_step.action == PlaywrightAction.CLICK:
                    await runner.click(script_step.selector)
                
                elif script_step.action == PlaywrightAction.HOVER:
                    await page.hover(script_step.selector)
                
                elif script_step.action == PlaywrightAction.TYPE:
                    if script_step.value:
                        await runner.fill(script_step.selector, script_step.value)
                
                elif script_step.action == PlaywrightAction.WAIT:
                    # Wait action uses wait_after_ms
                    pass
                
                elif script_step.action == PlaywrightAction.NAVIGATE:
                    await runner.navigate(script_step.selector)
                
                elif script_step.action == PlaywrightAction.SELECT:
                    if script_step.value:
                        await page.select_option(script_step.selector, script_step.value)
                
                elif script_step.action == PlaywrightAction.SCROLL:
                    await page.evaluate(f"document.querySelector('{script_step.selector}').scrollIntoView()")
                
                print(f"  ✓ Executed")
                
            except Exception as e:
                print(f"  ✗ Failed: {e}")
                # Log error but continue (script might be testing error states)
                error_msg = str(e)
                if len(error_msg) > 100:
                    error_msg = error_msg[:100] + "..."
                print(f"  Note: {error_msg}")
            
            # Wait after step
            if script_step.wait_after_ms > 0:
                await asyncio.sleep(script_step.wait_after_ms / 1000)
        
        print(f"\n✓ Script completed with {step_index} events\n")
        
    except Exception as e:
        error = str(e)
        print(f"\n✗ Error during run: {error}\n")
        logger.update_metadata(status=RunStatus.FAILED, error=error)
    
    finally:
        # Stop runner and save artifacts
        await runner.stop()
        
        # Calculate duration
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)
        
        # Get artifact paths
        video_path = runner.get_video_path()
        trace_path = runner.get_trace_path()
        
        # Update metadata
        logger.update_metadata(
            status=RunStatus.COMPLETED if not error else RunStatus.FAILED,
            completed_at=datetime.now(datetime.UTC).isoformat() if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat(),
            duration_ms=duration_ms,
            video_path=str(video_path.relative_to(output_dir)) if video_path else None,
            trace_path=str(trace_path.relative_to(output_dir)) if trace_path else None,
            events_path=f"{run_id}/events.json",
        )
        
        logger.metadata.metadata["eventCount"] = step_index
        logger._write_metadata()
        
        print(f"\n📊 Run Summary:")
        print(f"   Run ID: {run_id}")
        print(f"   Persona: {script.persona_name}")
        print(f"   Status: {logger.metadata.status.value}")
        print(f"   Duration: {(duration_ms / 1000):.2f}s")
        print(f"   Events: {step_index}")
        if run_group_id:
            print(f"   Run Group: {run_group_id}")
        print(f"   Output Dir: {logger.get_run_dir()}\n")
        
        if video_path:
            print(f"✓ Video: {video_path}")
        if trace_path:
            print(f"✓ Trace: {trace_path}")
        print(f"✓ Events: {logger.events_path}")
        print(f"✓ Metadata: {logger.metadata_path}\n")
    
    # Return result
    return PersonaFlowResult(
        run_id=run_id,
        success=error is None,
        event_count=step_index,
        duration_ms=duration_ms,
        video_path=str(video_path) if video_path else None,
        trace_path=str(trace_path) if trace_path else None,
        events_path=str(logger.events_path),
        metadata_path=str(logger.metadata_path),
        error=error
    )


# CLI entry point for testing
async def main():
    """Run a scripted persona for testing"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python -m src.playwright.scripted_runner <persona_id> <ui_version>")
        print("Example: python -m src.playwright.scripted_runner impatient_new_user v1")
        sys.exit(1)
    
    persona_id = sys.argv[1]
    ui_version = sys.argv[2]
    headless = "--headless" in sys.argv or "-h" in sys.argv
    
    try:
        result = await run_scripted_persona(
            persona_id=persona_id,
            ui_version=ui_version,
            headless=headless
        )
        
        if result.success:
            print("✅ Run completed successfully!")
        else:
            print(f"❌ Run failed: {result.error}")
            sys.exit(1)
    
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except ValidationError as e:
        print(f"❌ Script validation error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

