"""
POC 1: Scripted Playwright flow for Gen Z Creator Persona on V1 UI

This replicates the existing scripted sequence from the TypeScript version
but runs in Python with the backend's GPT-4o integration.

Outputs:
- Video recording
- Playwright trace
- events.json (custom event log)
- metadata.json (run metadata)
"""

import asyncio
import time
from datetime import datetime
from typing import Optional
from uuid import uuid4

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


async def run_gen_z_creator_v1(
    headless: bool = True,
    base_url: Optional[str] = None,
    output_dir: Optional[str] = None
) -> PersonaFlowResult:
    """
    Run the Gen Z Creator persona through the V1 onboarding flow.
    
    Args:
        headless: Whether to run browser in headless mode
        base_url: Base URL of the app (defaults to APP_BASE_URL)
        output_dir: Output directory for artifacts (defaults to PLAYWRIGHT_OUTPUT_DIR)
    
    Returns:
        PersonaFlowResult with paths to artifacts
    """
    # Setup
    run_id = f"run-{int(time.time() * 1000)}"
    persona_id = "gen-z-creator"
    scenario_id = "onboarding"
    ui_version = UIVersion.V1
    mode = RunMode.SCRIPTED
    
    base_url = base_url or APP_BASE_URL
    output_dir = output_dir or PLAYWRIGHT_OUTPUT_DIR
    
    start_time = time.time()
    started_at = datetime.utcnow().isoformat()
    
    print(f"\n🎭 Starting run: {run_id}")
    print(f"   Persona: {persona_id}")
    print(f"   UI Version: {ui_version.value}")
    print(f"   Mode: {mode.value}")
    print(f"   Headless: {headless}\n")
    
    # Initialize metadata
    metadata = PlaywrightRunMetadata(
        run_id=run_id,
        persona_id=persona_id,
        scenario_id=scenario_id,
        ui_version=ui_version,
        mode=mode,
        app_url=f"{base_url}/app?version={ui_version.value}",
        status=RunStatus.RUNNING,
        started_at=started_at,
        metadata={
            "browser": "chromium",
            "headless": headless,
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
        await asyncio.sleep(2)  # Wait for initial load
        
        # Step 0: Initial observation and confusion about goals
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-0",
            target_selector='[data-element-id="goal-option-maximize"]',
            target_element_id="goal-option-maximize",
            action=PlaywrightAction.HOVER,
            reasoning_text='Hmm, "Maximize Output"... what does that even mean? Is that like, work harder?',
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await page.hover('[data-element-id="goal-option-maximize"]')
        await asyncio.sleep(2)
        
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-0",
            target_selector='[data-element-id="goal-option-optimize"]',
            target_element_id="goal-option-optimize",
            action=PlaywrightAction.HOVER,
            reasoning_text='"Optimize Workflow" vs "Maximize Output"... these sound like the same thing?',
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await page.hover('[data-element-id="goal-option-optimize"]')
        await asyncio.sleep(2.5)
        
        # Step 1: Choose balance option
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-0",
            target_selector='[data-element-id="goal-option-balance"]',
            target_element_id="goal-option-balance",
            action=PlaywrightAction.CLICK,
            reasoning_text='I guess "Equilibrium Mode" makes the most sense, even though the wording is weird.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="goal-option-balance"]')
        await asyncio.sleep(1)
        
        # Step 2: Continue to next step
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-0",
            target_selector='[data-element-id="step0-continue"]',
            target_element_id="step0-continue",
            action=PlaywrightAction.CLICK,
            reasoning_text='Okay, moving on.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="step0-continue"]')
        await asyncio.sleep(0.5)
        
        # Step 3: Engagement Mode confusion
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-1",
            target_selector='[data-element-id="engagement-intensity-slider"]',
            target_element_id="engagement-intensity-slider",
            action=PlaywrightAction.WAIT,
            reasoning_text='Wait, what? "Engagement Mode"? "Interaction paradigm"? This is so vague.',
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await asyncio.sleep(3)
        
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-1",
            target_selector='[data-element-id="engagement-intensity-slider"]',
            target_element_id="engagement-intensity-slider",
            action=PlaywrightAction.CLICK,
            reasoning_text="I'll just move this slider to the middle I guess?",
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="engagement-intensity-slider"]')
        await asyncio.sleep(1.5)
        
        # Step 4: Button hierarchy confusion
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-1",
            target_selector='[data-element-id="step1-continue"]',
            target_element_id="step1-continue",
            action=PlaywrightAction.HOVER,
            reasoning_text='Where\'s the main button? Oh, "Next Step" is not even highlighted...',
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await page.hover('[data-element-id="step1-continue"]')
        await asyncio.sleep(2)
        
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-1",
            target_selector='[data-element-id="step1-continue"]',
            target_element_id="step1-continue",
            action=PlaywrightAction.CLICK,
            reasoning_text='Finally found it.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="step1-continue"]')
        await asyncio.sleep(0.8)
        
        # Step 5: Notifications screen
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-2",
            target_selector='[data-element-id="notification-updates"]',
            target_element_id="notification-updates",
            action=PlaywrightAction.WAIT,
            reasoning_text='Okay, notifications. Let me just check the important ones.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await asyncio.sleep(1)
        
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-2",
            target_selector='[data-element-id="notification-updates"]',
            target_element_id="notification-updates",
            action=PlaywrightAction.CLICK,
            reasoning_text='System updates, sure.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="notification-updates"]')
        await asyncio.sleep(0.5)
        
        # Step 6: Confusing button layout
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-2",
            target_selector='[data-element-id="step2-skip"]',
            target_element_id="step2-skip",
            action=PlaywrightAction.HOVER,
            reasoning_text='Wait, is "Skip" the main button here? That doesn\'t make sense...',
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await page.hover('[data-element-id="step2-skip"]')
        await asyncio.sleep(2.5)
        
        # Step 7: Accidentally click back
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-2",
            target_selector='[data-element-id="step2-back"]',
            target_element_id="step2-back",
            action=PlaywrightAction.CLICK,
            reasoning_text='I\'ll click "Previous" to continue? This layout is confusing.',
            status=EventStatus.CONFUSED,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="step2-back"]')
        await asyncio.sleep(1)
        
        # Step 8: Realize mistake
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-1",
            target_selector='[data-element-id="step1-continue"]',
            target_element_id="step1-continue",
            action=PlaywrightAction.WAIT,
            reasoning_text='Oh no, I went back. Let me go forward again.',
            status=EventStatus.BLOCKED,
            timestamp=time.time()
        ))
        step_index += 1
        await asyncio.sleep(1.5)
        
        # Step 9: Go forward again
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-1",
            target_selector='[data-element-id="step1-continue"]',
            target_element_id="step1-continue",
            action=PlaywrightAction.CLICK,
            reasoning_text='Going forward again...',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="step1-continue"]')
        await asyncio.sleep(0.5)
        
        # Step 10: Skip notifications
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-2",
            target_selector='[data-element-id="step2-skip"]',
            target_element_id="step2-skip",
            action=PlaywrightAction.CLICK,
            reasoning_text='Let me just skip this.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="step2-skip"]')
        await asyncio.sleep(0.8)
        
        # Step 11: Review screen
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-3",
            target_selector='[data-element-id="step3-finish"]',
            target_element_id="step3-finish",
            action=PlaywrightAction.WAIT,
            reasoning_text='Okay, review screen. Let me finish this.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await asyncio.sleep(1)
        
        # Step 12: Finish
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            screen_id="step-3",
            target_selector='[data-element-id="step3-finish"]',
            target_element_id="step3-finish",
            action=PlaywrightAction.CLICK,
            reasoning_text='Done! Finally.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        await runner.click('[data-element-id="step3-finish"]')
        await asyncio.sleep(0.5)
        
        # Wait a bit for final state
        await asyncio.sleep(1)
        
        print(f"\n✓ Test completed with {step_index} events\n")
        
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
            completed_at=datetime.utcnow().isoformat(),
            duration_ms=duration_ms,
            video_path=str(video_path.relative_to(output_dir)) if video_path else None,
            trace_path=str(trace_path.relative_to(output_dir)) if trace_path else None,
            events_path=f"{run_id}/events.json",
        )
        
        logger.metadata.metadata["eventCount"] = step_index
        logger._write_metadata()
        
        print(f"\n📊 Run Summary:")
        print(f"   Run ID: {run_id}")
        print(f"   Status: {logger.metadata.status.value}")
        print(f"   Duration: {(duration_ms / 1000):.2f}s")
        print(f"   Events: {step_index}")
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
    """Run the Gen Z Creator flow standalone for testing"""
    result = await run_gen_z_creator_v1(headless=False)
    
    if result.success:
        print("✅ Run completed successfully!")
    else:
        print(f"❌ Run failed: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())

