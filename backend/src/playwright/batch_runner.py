"""
Batch runner for executing multiple persona scripts as a suite.

This allows running all personas for a given UI version with a shared run_group_id
for easy grouping and analysis in the demo.
"""

import asyncio
import time
from pathlib import Path
from typing import Optional, List
from uuid import uuid4

from .scripted_runner import run_scripted_persona, load_script
from .models import PersonaFlowResult
from src.config import APP_BASE_URL, PLAYWRIGHT_OUTPUT_DIR


# Default personas to run (all 5)
DEFAULT_PERSONAS = [
    "impatient_new_user",
    "methodical_evaluator",
    "power_user_explorer",
    "privacy_skeptic",
    "accessibility_screen_reader",
]


async def run_persona_suite(
    ui_version: str,
    persona_ids: Optional[List[str]] = None,
    run_group_id: Optional[str] = None,
    headless: bool = True,
    base_url: Optional[str] = None,
    output_dir: Optional[str] = None,
    scripts_dir: Optional[Path] = None
) -> dict:
    """
    Run a suite of persona scripts for a given UI version.
    
    Args:
        ui_version: UI version to test ('v1' or 'v2')
        persona_ids: List of persona IDs to run (defaults to all 5)
        run_group_id: Optional group ID (generated if not provided)
        headless: Whether to run browser in headless mode
        base_url: Base URL of the app
        output_dir: Output directory for artifacts
        scripts_dir: Optional custom scripts directory
    
    Returns:
        Dictionary with run_group_id and results for each persona
    """
    # Default to all personas if not specified
    if persona_ids is None:
        persona_ids = DEFAULT_PERSONAS
    
    # Generate run_group_id if not provided
    if run_group_id is None:
        run_group_id = f"suite-{ui_version}-{int(time.time() * 1000)}"
    
    print(f"\n{'='*70}")
    print(f"🎭 PERSONA SUITE RUN")
    print(f"{'='*70}")
    print(f"UI Version: {ui_version}")
    print(f"Run Group ID: {run_group_id}")
    print(f"Personas: {len(persona_ids)}")
    for persona_id in persona_ids:
        print(f"  - {persona_id}")
    print(f"Headless: {headless}")
    print(f"{'='*70}\n")
    
    results = []
    successful = 0
    failed = 0
    
    start_time = time.time()
    
    # Run each persona sequentially
    for i, persona_id in enumerate(persona_ids, 1):
        print(f"\n{'─'*70}")
        print(f"[{i}/{len(persona_ids)}] Running: {persona_id}")
        print(f"{'─'*70}")
        
        try:
            result = await run_scripted_persona(
                persona_id=persona_id,
                ui_version=ui_version,
                run_group_id=run_group_id,
                headless=headless,
                base_url=base_url,
                output_dir=output_dir,
                scripts_dir=scripts_dir
            )
            
            results.append({
                "persona_id": persona_id,
                "run_id": result.run_id,
                "success": result.success,
                "duration_ms": result.duration_ms,
                "event_count": result.event_count,
                "video_path": result.video_path,
                "events_path": result.events_path,
                "metadata_path": result.metadata_path,
                "error": result.error
            })
            
            if result.success:
                successful += 1
                print(f"\n✅ {persona_id} completed successfully")
            else:
                failed += 1
                print(f"\n❌ {persona_id} failed: {result.error}")
        
        except Exception as e:
            failed += 1
            error_msg = str(e)
            print(f"\n❌ {persona_id} failed with exception: {error_msg}")
            
            results.append({
                "persona_id": persona_id,
                "run_id": None,
                "success": False,
                "duration_ms": 0,
                "event_count": 0,
                "video_path": None,
                "events_path": None,
                "metadata_path": None,
                "error": error_msg
            })
    
    total_time = time.time() - start_time
    
    # Summary
    print(f"\n{'='*70}")
    print(f"📊 SUITE SUMMARY")
    print(f"{'='*70}")
    print(f"Run Group ID: {run_group_id}")
    print(f"UI Version: {ui_version}")
    print(f"Total Time: {total_time:.2f}s")
    print(f"Personas Run: {len(persona_ids)}")
    print(f"  ✅ Successful: {successful}")
    print(f"  ❌ Failed: {failed}")
    print(f"{'='*70}\n")
    
    # Detailed results
    print("Detailed Results:")
    for result in results:
        status = "✅" if result["success"] else "❌"
        print(f"\n{status} {result['persona_id']}")
        if result["success"]:
            print(f"   Run ID: {result['run_id']}")
            print(f"   Duration: {result['duration_ms']/1000:.2f}s")
            print(f"   Events: {result['event_count']}")
            print(f"   Video: {result['video_path']}")
        else:
            print(f"   Error: {result['error']}")
    
    print(f"\n{'='*70}\n")
    
    return {
        "run_group_id": run_group_id,
        "ui_version": ui_version,
        "total_duration_ms": int(total_time * 1000),
        "total_personas": len(persona_ids),
        "successful": successful,
        "failed": failed,
        "results": results
    }


# CLI entry point
async def main():
    """Run a persona suite from command line"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python -m src.playwright.batch_runner <ui_version> [persona_ids...] [--headless]")
        print("\nExamples:")
        print("  # Run all personas for v1")
        print("  python -m src.playwright.batch_runner v1")
        print("\n  # Run specific personas for v1")
        print("  python -m src.playwright.batch_runner v1 impatient_new_user methodical_evaluator")
        print("\n  # Run all personas headless")
        print("  python -m src.playwright.batch_runner v1 --headless")
        sys.exit(1)
    
    ui_version = sys.argv[1]
    
    # Parse arguments
    persona_ids = []
    headless = False
    
    for arg in sys.argv[2:]:
        if arg in ["--headless", "-h"]:
            headless = True
        elif not arg.startswith("-"):
            persona_ids.append(arg)
    
    # Default to all personas if none specified
    if not persona_ids:
        persona_ids = DEFAULT_PERSONAS
        print(f"No personas specified, running all {len(DEFAULT_PERSONAS)}")
    
    try:
        result = await run_persona_suite(
            ui_version=ui_version,
            persona_ids=persona_ids,
            headless=headless
        )
        
        if result["failed"] == 0:
            print("✅ All personas completed successfully!")
            sys.exit(0)
        else:
            print(f"⚠️  {result['failed']} persona(s) failed")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

