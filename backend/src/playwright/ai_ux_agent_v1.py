"""
POC 2: LLM-driven Playwright flow for AI UX Agent Persona on V1 UI

This uses GPT-4o to drive an AI UX agent through the onboarding flow,
making real-time decisions and generating reasoning.

Outputs:
- Video recording
- Playwright trace
- events.json (with LLM-generated reasoning)
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
from .llm_agent import extract_page_state, get_llm_decision, execute_llm_decision
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR


# AI UX Agent Persona Definition
AI_UX_AGENT_PERSONA = {
    "name": "AI UX Agent",
    "description": "an AI-powered UX testing agent designed to quickly identify usability issues and navigate through interfaces efficiently",
    "goals": [
        "Complete onboarding flows quickly and efficiently",
        "Identify confusing or ambiguous UI elements",
        "Flag cognitive load issues and unclear language",
        "Prioritize clear calls to action"
    ],
    "preferences": [
        "Clear, concise labels and instructions",
        "Prominent primary actions",
        "Consistent button placement",
        "Plain language over jargon"
    ],
    "pain_points": [
        "Ambiguous or overly technical language",
        "Unclear visual hierarchy",
        "Inconsistent navigation patterns",
        "Hidden or hard-to-find primary actions"
    ],
    "tone": "analytical, direct, and efficiency-focused"
}


async def run_ai_ux_agent_v1(
    headless: bool = True,
    base_url: Optional[str] = None,
    output_dir: Optional[str] = None,
    max_steps: int = 20
) -> PersonaFlowResult:
    """
    Run the AI UX Agent through the V1 onboarding flow using LLM.
    
    Args:
        headless: Whether to run browser in headless mode
        base_url: Base URL of the app (defaults to APP_BASE_URL)
        output_dir: Output directory for artifacts (defaults to PLAYWRIGHT_OUTPUT_DIR)
        max_steps: Maximum number of steps before timeout
    
    Returns:
        PersonaFlowResult with paths to artifacts
    """
    # Setup
    run_id = f"run-llm-{int(time.time() * 1000)}"
    persona_id = "ai-ux-agent"
    scenario_id = "onboarding"
    ui_version = UIVersion.V1
    mode = RunMode.LLM_DRIVEN
    
    base_url = base_url or APP_BASE_URL
    output_dir = output_dir or PLAYWRIGHT_OUTPUT_DIR
    
    start_time = time.time()
    started_at = datetime.utcnow().isoformat()
    
    print(f"\n🤖 Starting LLM-driven run: {run_id}")
    print(f"   Persona: {persona_id}")
    print(f"   UI Version: {ui_version.value}")
    print(f"   Mode: {mode.value}")
    print(f"   Headless: {headless}")
    print(f"   Max Steps: {max_steps}\n")
    
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
            "llm_model": "gpt-4o"
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
        
        # Run LLM-driven flow
        for step in range(max_steps):
            print(f"\n[Step {step + 1}/{max_steps}]")
            
            # Minimal wait for page to settle (optimized)
            try:
                await page.wait_for_load_state('domcontentloaded', timeout=1000)
            except:
                pass
            await asyncio.sleep(0.1)  # Minimal settling time
            
            # Extract page state
            page_state = await extract_page_state(page)
            print(f"Screen: {page_state.screen_id or 'unknown'}")
            print(f"Available elements: {len(page_state.available_elements)}")
            
            # Get LLM decision
            print("Asking LLM for decision...")
            decision = await get_llm_decision(
                persona_name=AI_UX_AGENT_PERSONA["name"],
                persona_description=AI_UX_AGENT_PERSONA["description"],
                persona_goals=AI_UX_AGENT_PERSONA["goals"],
                persona_preferences=AI_UX_AGENT_PERSONA["preferences"],
                persona_pain_points=AI_UX_AGENT_PERSONA["pain_points"],
                persona_tone=AI_UX_AGENT_PERSONA["tone"],
                page_state=page_state
            )
            
            print(f"Decision: {decision.action.value} on {decision.selector}")
            print(f"Reasoning: \"{decision.reasoning}\"")
            print(f"Status: {decision.status.value}")
            print(f"Continue: {decision.should_continue}")
            
            # Extract target element ID from selector
            target_element_id = None
            if 'data-element-id=' in decision.selector:
                try:
                    target_element_id = decision.selector.split('data-element-id="')[1].split('"')[0]
                except:
                    pass
            
            # Log the event
            logger.log_event(PlaywrightEvent(
                run_id=run_id,
                persona_id=persona_id,
                step_index=step_index,
                screen_id=page_state.screen_id,
                target_selector=decision.selector,
                target_element_id=target_element_id,
                action=decision.action,
                reasoning_text=decision.reasoning,
                status=decision.status,
                timestamp=time.time()
            ))
            step_index += 1
            
            # Check if should continue
            if not decision.should_continue:
                print("\n✓ Flow complete (LLM signaled completion)\n")
                break
            
            # Execute decision
            try:
                await execute_llm_decision(page, decision)
                print("✓ Action executed successfully")
            except Exception as e:
                print(f"✗ Action failed: {e}")
                # Log the failure
                logger.log_event(PlaywrightEvent(
                    run_id=run_id,
                    persona_id=persona_id,
                    step_index=step_index,
                    screen_id=page_state.screen_id,
                    target_selector=decision.selector,
                    target_element_id=target_element_id,
                    action=PlaywrightAction.WAIT,
                    reasoning_text=f"Action failed: {str(e)}. Pausing to reassess.",
                    status=EventStatus.BLOCKED,
                    timestamp=time.time()
                ))
                step_index += 1
            
            # Minimal delay between actions (optimized)
            await asyncio.sleep(0.1)  # Fast execution like scripted
        
        if step >= max_steps - 1:
            print(f"\n⚠ Reached max steps ({max_steps})\n")
        
        print(f"✓ Test completed with {step_index} events\n")
        
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
    """Run the AI UX Agent flow standalone for testing"""
    result = await run_ai_ux_agent_v1(headless=False, max_steps=15)
    
    if result.success:
        print("✅ Run completed successfully!")
    else:
        print(f"❌ Run failed: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())

