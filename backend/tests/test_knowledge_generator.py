"""
Integration test for KnowledgeGenerator.

Tests knowledge generation with hard-coded inputs:
- Persona from PersonaRepository
- Browser events from Playwright run data

Run from backend directory:
    python -m tests.test_knowledge_generator
    # or
    uv run python -m tests.test_knowledge_generator
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend directory to path so imports work regardless of where script is run from
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from src.knowledge_generator import KnowledgeGenerator
    from src.persona_repository import repository
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("\nMake sure dependencies are installed:")
    print("  cd backend")
    print("  uv sync")
    print("  # or")
    print("  pip install -e .")
    sys.exit(1)


async def test_knowledge_generation():
    """Integration test for knowledge generation."""
    
    # Get a persona from repository
    persona = repository.get_by_id("power_user_explorer")
    if not persona:
        # Fallback to first available persona
        all_personas = repository.get_all()
        if not all_personas:
            raise ValueError("No personas found in repository")
        persona = all_personas[0]
    
    print(f"Using persona: {persona.display_name} ({persona.id})")
    
    # Load browser events from Playwright run
    # Resolve path relative to backend directory
    backend_dir = Path(__file__).parent.parent
    events_path = backend_dir / "playwright-runs/run-llm-1765364405721/events.json"
    if not events_path.exists():
        raise FileNotFoundError(f"Events file not found: {events_path}")
    
    with open(events_path, 'r') as f:
        browser_events = json.load(f)
    
    print(f"Loaded {len(browser_events)} browser events")
    
    # Create knowledge generator
    generator = KnowledgeGenerator(
        persona=persona,
        browser_events=browser_events
    )
    
    # Generate knowledge
    print("\nGenerating knowledge...")
    result = await generator.generate_knowledge()
    
    print("\n" + "="*60)
    print(f"Generated Knowledge ({len(result)} items):")
    print("="*60)
    
    for i, knowledge_item in enumerate(result, 1):
        try:
            item_data = json.loads(knowledge_item)
            print(f"\n[{i}] {item_data.get('statement', 'N/A')}")
            print(f"    Reasoning: {item_data.get('reasoning', 'N/A')}")
        except json.JSONDecodeError:
            print(f"\n[{i}] {knowledge_item}")
    
    print("\n" + "="*60)
    
    return result


if __name__ == "__main__":
    asyncio.run(test_knowledge_generation())

