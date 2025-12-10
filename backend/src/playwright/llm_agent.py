"""
LLM Agent Integration for Playwright POC 2

Provides LLM-driven decision making for AI/UX agent personas.
Uses GPT-4o via the backend's existing llm_gpt_4o integration.
"""

import json
from typing import Optional, Dict, Any
from playwright.async_api import Page

from .models import LLMDecision, PageState, PlaywrightAction, EventStatus
from src.utils import llm_gpt_4o


async def extract_page_state(page: Page) -> PageState:
    """
    Extract current page state for LLM context.
    
    Args:
        page: Playwright page object
    
    Returns:
        PageState with title, URL, visible text, and available elements
    """
    # Get available interactive elements with data-element-id
    available_elements = await page.evaluate('''() => {
        const elements = Array.from(document.querySelectorAll('[data-element-id]'));
        return elements.map(el => ({
            id: el.getAttribute('data-element-id') || '',
            text: (el.textContent || '').trim().substring(0, 100),
            type: el.tagName.toLowerCase(),
            selector: `[data-element-id="${el.getAttribute('data-element-id')}"]`
        }));
    }''')
    
    # Get page content
    title = await page.title()
    url = page.url
    visible_text = await page.evaluate('() => document.body.innerText.substring(0, 800)')
    
    # Try to determine screen ID
    try:
        screen_id = await page.get_attribute('[data-screen-id]', 'data-screen-id')
    except:
        screen_id = None
    
    return PageState(
        title=title,
        url=url,
        visible_text=visible_text,
        available_elements=available_elements,
        screen_id=screen_id
    )


async def get_llm_decision(
    persona_name: str,
    persona_description: str,
    persona_goals: list[str],
    persona_preferences: list[str],
    persona_pain_points: list[str],
    persona_tone: str,
    page_state: PageState
) -> LLMDecision:
    """
    Get LLM decision for next action using GPT-4o.
    
    Args:
        persona_name: Name of the persona
        persona_description: Description of the persona
        persona_goals: List of persona goals
        persona_preferences: List of persona preferences
        persona_pain_points: List of persona pain points
        persona_tone: Persona tone/style
        page_state: Current page state
    
    Returns:
        LLMDecision with action, selector, reasoning, etc.
    """
    system_prompt = f"""You are {persona_name}, {persona_description}.

Your characteristics:
- Goals: {'; '.join(persona_goals)}
- Preferences: {'; '.join(persona_preferences)}
- Pain Points: {'; '.join(persona_pain_points)}
- Tone: {persona_tone}

You are testing a web application's user interface. At each step, observe what's on the screen and decide what action to take next based on your personality, goals, and pain points.

Think like a real user with your specific characteristics. Express confusion when things are unclear, delight when things work well, and frustration when blocked."""

    elements_list = '\n'.join([
        f"{i + 1}. [{el['type']}] \"{el['text']}\" (id: {el['id']})"
        for i, el in enumerate(page_state.available_elements)
    ])

    user_prompt = f"""Current page state:

Title: {page_state.title}
URL: {page_state.url}
Screen: {page_state.screen_id or 'unknown'}

Visible text on page (truncated):
{page_state.visible_text}

Available interactive elements:
{elements_list}

What do you do next? Consider your goals, preferences, and pain points.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{{
  "action": "CLICK" | "HOVER" | "TYPE" | "WAIT",
  "selector": "[data-element-id='exact-id-here']",
  "reasoning": "Your first-person thought process explaining why (1-2 sentences)",
  "status": "success" | "confused" | "blocked" | "delighted",
  "shouldContinue": true | false,
  "textToType": "optional - only if action is TYPE"
}}

Important:
- Use EXACTLY one of the selectors from the available elements list
- Keep reasoning conversational and in-character
- Set shouldContinue to false if you've completed the flow or are stuck
- Match status to your emotional state (confused if unclear, delighted if pleasant)"""

    try:
        # Use the backend's LLM integration
        # The llm_gpt_4o model is from openai-agents, so we need to adapt the call
        from agents import Runner, Agent, RunConfig
        
        # Create a simple agent for this decision
        decision_agent = Agent(
            name='ux_agent_decision',
            instructions=system_prompt,
            model=llm_gpt_4o
        )
        
        # Run the agent to get the decision
        result = await Runner.run(
            decision_agent,
            input=user_prompt,
            run_config=RunConfig(tracing_disabled=True)
        )
        
        response_text = result.final_output
        
        # Try to extract JSON from the response
        # Sometimes LLMs wrap JSON in markdown code blocks
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        # Parse JSON
        decision_dict = json.loads(response_text)
        
        # Validate and create LLMDecision
        action_str = decision_dict.get('action', 'WAIT')
        status_str = decision_dict.get('status', 'success')
        
        # Map strings to enums
        action = PlaywrightAction[action_str.upper()]
        status = EventStatus[status_str.upper()]
        
        decision = LLMDecision(
            action=action,
            selector=decision_dict.get('selector', 'body'),
            reasoning=decision_dict.get('reasoning', 'I need a moment to think.'),
            should_continue=decision_dict.get('shouldContinue', False),
            text_to_type=decision_dict.get('textToType'),
            status=status
        )
        
        return decision
    
    except Exception as e:
        print(f"Error getting LLM decision: {e}")
        
        # Fallback: safe wait action
        return LLMDecision(
            action=PlaywrightAction.WAIT,
            selector='body',
            reasoning='I need a moment to think about what to do next.',
            should_continue=False,
            status=EventStatus.CONFUSED
        )


async def execute_llm_decision(page: Page, decision: LLMDecision) -> None:
    """
    Execute an LLM decision on the page.
    
    Args:
        page: Playwright page object
        decision: LLM decision to execute
    """
    try:
        if decision.action == PlaywrightAction.CLICK:
            await page.click(decision.selector, timeout=5000)
        
        elif decision.action == PlaywrightAction.HOVER:
            await page.hover(decision.selector, timeout=5000)
        
        elif decision.action == PlaywrightAction.TYPE:
            if decision.text_to_type:
                await page.fill(decision.selector, decision.text_to_type, timeout=5000)
        
        elif decision.action == PlaywrightAction.WAIT:
            await page.wait_for_timeout(1000)
        
        else:
            print(f"Unknown action: {decision.action}")
    
    except Exception as e:
        print(f"Error executing {decision.action} on {decision.selector}: {e}")
        raise


async def run_llm_persona_flow(
    page: Page,
    persona_name: str,
    persona_description: str,
    persona_goals: list[str],
    persona_preferences: list[str],
    persona_pain_points: list[str],
    persona_tone: str,
    max_steps: int = 20
) -> list[LLMDecision]:
    """
    Run a complete LLM-driven persona flow.
    
    Args:
        page: Playwright page object
        persona_name: Name of the persona
        persona_description: Description of the persona
        persona_goals: List of persona goals
        persona_preferences: List of persona preferences
        persona_pain_points: List of persona pain points
        persona_tone: Persona tone/style
        max_steps: Maximum number of steps before timeout
    
    Returns:
        List of LLM decisions made during the flow
    """
    decisions: list[LLMDecision] = []
    
    for step in range(max_steps):
        print(f"\n[LLM Agent] Step {step + 1}/{max_steps}")
        
        # Wait for page to settle
        try:
            await page.wait_for_load_state('networkidle', timeout=5000)
        except:
            pass
        await page.wait_for_timeout(500)
        
        # Extract page state
        page_state = await extract_page_state(page)
        print(f"[LLM Agent] Screen: {page_state.screen_id or 'unknown'}")
        print(f"[LLM Agent] Available elements: {len(page_state.available_elements)}")
        
        # Get LLM decision
        print("[LLM Agent] Asking LLM for decision...")
        decision = await get_llm_decision(
            persona_name,
            persona_description,
            persona_goals,
            persona_preferences,
            persona_pain_points,
            persona_tone,
            page_state
        )
        decisions.append(decision)
        
        print(f"[LLM Agent] Decision: {decision.action.value} {decision.selector}")
        print(f"[LLM Agent] Reasoning: \"{decision.reasoning}\"")
        print(f"[LLM Agent] Status: {decision.status.value}")
        
        # Check if should continue
        if not decision.should_continue:
            print("[LLM Agent] Flow complete (shouldContinue=false)")
            break
        
        # Execute decision
        try:
            await execute_llm_decision(page, decision)
            print("[LLM Agent] ✓ Action executed successfully")
        except Exception as e:
            print(f"[LLM Agent] ✗ Action failed: {e}")
            # Continue anyway - LLM might recover
        
        # Small delay between actions
        await page.wait_for_timeout(1000)
    
    print(f"\n[LLM Agent] Flow completed with {len(decisions)} steps\n")
    return decisions

