"""
POC 2 (Plan-Then-Execute): LLM-driven Playwright flow for AI UX Agent on V1 UI

This uses GPT-4o-mini with plan-then-execute architecture:
- LLM is called once per screen to generate a plan
- Plan is executed quickly via Playwright
- Much faster than per-step LLM calls

Outputs:
- Video recording
- Playwright trace
- events.json (with LLM-generated reasoning per action)
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
    ScreenSummary,
)
from .runner_core import PlaywrightRunner
from .logger import EventLogger
from .llm_agent import extract_page_state, plan_screen
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR


# AI UX Agent Persona Definition
AI_UX_AGENT_PERSONA = {
    "name": "AI UX Agent",
    "description": "an AI-powered UX testing agent designed to quickly identify usability issues",
    "goals": [
        "Complete onboarding flows quickly",
        "Identify confusing UI elements",
        "Flag cognitive load issues"
    ],
    "pain_points": [
        "Ambiguous or technical language",
        "Unclear visual hierarchy",
        "Inconsistent navigation"
    ],
    "tone": "analytical and efficiency-focused"
}

# Expected screens in V1 flow
EXPECTED_SCREENS = ["step-0", "step-1", "step-2", "step-3"]


async def run_ai_ux_agent_v1_plan(
    headless: bool = True,
    base_url: Optional[str] = None,
    output_dir: Optional[str] = None,
    max_screens: int = 10
) -> PersonaFlowResult:
    """
    Run the AI UX Agent through the V1 onboarding using plan-then-execute.
    
    Args:
        headless: Whether to run browser in headless mode
        base_url: Base URL of the app
        output_dir: Output directory for artifacts
        max_screens: Maximum number of screens before timeout
    
    Returns:
        PersonaFlowResult with paths to artifacts
    """
    # Setup
    run_id = f"run-llm-plan-{int(time.time() * 1000)}"
    persona_id = "ai-ux-agent"
    scenario_id = "onboarding"
    ui_version = UIVersion.V1
    mode = RunMode.LLM_DRIVEN
    
    base_url = base_url or APP_BASE_URL
    output_dir = output_dir or PLAYWRIGHT_OUTPUT_DIR
    
    start_time = time.time()
    started_at = datetime.now(datetime.UTC).isoformat() if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat()
    
    print(f"\n🤖 Starting plan-then-execute run: {run_id}")
    print(f"   Persona: {persona_id}")
    print(f"   UI Version: {ui_version.value}")
    print(f"   Mode: {mode.value} (plan-then-execute)")
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
            "llm_model": "gpt-4o-mini",
            "architecture": "plan-then-execute"
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
        await asyncio.sleep(1)
        
        # Log initial navigation
        logger.log_event(PlaywrightEvent(
            run_id=run_id,
            persona_id=persona_id,
            step_index=step_index,
            target_selector='page',
            action=PlaywrightAction.NAVIGATE,
            reasoning_text='Navigating to the onboarding flow to begin UX testing.',
            status=EventStatus.SUCCESS,
            timestamp=time.time()
        ))
        step_index += 1
        
        # Plan-then-execute per screen
        for screen_num in range(max_screens):
            print(f"\n[Screen {screen_num + 1}/{max_screens}]")
            
            # Wait for page to settle
            try:
                await page.wait_for_load_state('domcontentloaded', timeout=2000)
            except:
                pass
            await asyncio.sleep(0.3)
            
            # Extract page state for screen summary
            page_state = await extract_page_state(page)
            
            # Determine screen ID
            current_screen_id = page_state.screen_id or f"step-{screen_num}"
            print(f"Screen ID: {current_screen_id}")
            print(f"Available elements: {len(page_state.available_elements)}")
            
            # Build screen summary
            screen_summary = ScreenSummary(
                screen_id=current_screen_id,
                title=page_state.title,
                url=page_state.url,
                available_elements=[
                    {'id': el['id'], 'label': el['text'][:30], 'type': el['type']}
                    for el in page_state.available_elements
                ]
            )
            
            # Call planner once for this screen
            print(f"[Planner] Generating plan for {current_screen_id}...")
            screen_plan = await plan_screen(
                persona_name=AI_UX_AGENT_PERSONA["name"],
                persona_description=AI_UX_AGENT_PERSONA["description"],
                persona_goals=AI_UX_AGENT_PERSONA["goals"],
                persona_pain_points=AI_UX_AGENT_PERSONA["pain_points"],
                screen_summary=screen_summary
            )
            
            print(f"[Planner] Got plan with {len(screen_plan.actions)} actions")
            
            # Execute the plan
            failed_actions = 0
            for action_idx, plan_action in enumerate(screen_plan.actions):
                print(f"\n[Execute] {plan_action.action.value} on {plan_action.selector}")
                print(f"[Execute] Reasoning: \"{plan_action.reasoning}\"")
                
                # Extract target element ID
                target_element_id = None
                if 'data-element-id=' in plan_action.selector:
                    try:
                        target_element_id = plan_action.selector.split('data-element-id="')[1].split('"')[0]
                    except:
                        pass
                
                # Log the event with plan's reasoning
                logger.log_event(PlaywrightEvent(
                    run_id=run_id,
                    persona_id=persona_id,
                    step_index=step_index,
                    screen_id=current_screen_id,
                    target_selector=plan_action.selector,
                    target_element_id=target_element_id,
                    action=plan_action.action,
                    reasoning_text=plan_action.reasoning,
                    status=EventStatus.SUCCESS,  # Will be updated if fails
                    timestamp=time.time()
                ))
                step_index += 1
                
                # Execute the action (optimized for speed)
                try:
                    if plan_action.action == PlaywrightAction.CLICK:
                        # Just try to click - faster than pre-checking
                        await runner.click(plan_action.selector)
                    
                    elif plan_action.action == PlaywrightAction.TYPE:
                        if plan_action.value:
                            await runner.fill(plan_action.selector, plan_action.value)
                    
                    elif plan_action.action == PlaywrightAction.HOVER:
                        # Reduced timeout for speed
                        await page.hover(plan_action.selector, timeout=500)
                    
                    elif plan_action.action == PlaywrightAction.WAIT:
                        await asyncio.sleep(0.5)  # Reduced from 1s
                    
                    print("[Execute] ✓")
                    
                    # Minimal delay
                    await asyncio.sleep(0.1)
                
                except Exception as e:
                    print(f"[Execute] ✗ Action failed: {e}")
                    failed_actions += 1
                    
                    # Log failure but continue with next action
                    logger.log_event(PlaywrightEvent(
                        run_id=run_id,
                        persona_id=persona_id,
                        step_index=step_index,
                        screen_id=current_screen_id,
                        target_selector=plan_action.selector,
                        target_element_id=target_element_id,
                        action=PlaywrightAction.WAIT,
                        reasoning_text=f"Action failed: {str(e)}. Continuing with plan.",
                        status=EventStatus.BLOCKED,
                        timestamp=time.time()
                    ))
                    step_index += 1
                    
                    # If too many failures, consider replan (optional stretch)
                    if failed_actions >= 2 and action_idx < len(screen_plan.actions) - 1:
                        print(f"\n⚠️  Multiple failures detected. Skipping rest of plan for this screen.")
                        break
            
            # Check if we've reached the end
            if current_screen_id == "step-3" or "success" in page.url.lower():
                print("\n✓ Flow appears complete (reached final screen)")
                break
        
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
    """Run the AI UX Agent flow with plan-then-execute for testing"""
    result = await run_ai_ux_agent_v1_plan(headless=False)
    
    if result.success:
        print("✅ Run completed successfully!")
    else:
        print(f"❌ Run failed: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())

