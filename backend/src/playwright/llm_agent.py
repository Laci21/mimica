"""
LLM Agent Integration for Playwright POC 2

Provides LLM-driven decision making for AI/UX agent personas.
Uses GPT-4o via the backend's existing llm_gpt_4o integration.
"""

import json
from typing import Optional, Dict, Any
from playwright.async_api import Page

from .models import (
    LLMDecision, PageState, PlaywrightAction, EventStatus,
    ScreenPlan, PlanAction, ScreenSummary, FullFlowPlan
)
from src.utils import llm_gpt_4o


async def extract_page_state(page: Page) -> PageState:
    """
    Extract current page state for LLM context.
    
    Args:
        page: Playwright page object
    
    Returns:
        PageState with title, URL, visible text, and available elements
    """
    # Get available interactive elements with data-element-id (excluding disabled)
    available_elements = await page.evaluate('''() => {
        const elements = Array.from(document.querySelectorAll('[data-element-id]'));
        return elements
            .filter(el => !el.disabled && !el.classList.contains('disabled'))
            .map(el => ({
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
    # Shortened prompt for faster response
    system_prompt = f"""You are {persona_name}, testing a UI.
Goals: {'; '.join(persona_goals[:2])}
Pain points: {'; '.join(persona_pain_points[:2])}
Respond with valid JSON only."""

    # Limit elements list for faster processing
    elements_list = '\n'.join([
        f"{i + 1}. \"{el['text'][:30]}\" (id: {el['id']})"
        for i, el in enumerate(page_state.available_elements[:15])  # Limit to 15 elements
    ])

    # Shortened prompt for faster response
    user_prompt = f"""Page: {page_state.title}
Elements:
{elements_list}

Next action JSON:
{{"action":"CLICK|HOVER|TYPE|WAIT","selector":"[data-element-id='id-here']","reasoning":"brief thought","status":"success|confused|blocked|delighted","shouldContinue":true|false,"textToType":"optional"}}

Use exact selector from list."""

    try:
        # Use the backend's LLM integration (gpt-4o-mini for speed)
        from agents import Runner, Agent, RunConfig
        
        # Create agent (using gpt-4o-mini from utils.py for speed)
        decision_agent = Agent(
            name='ux_agent_decision',
            instructions=system_prompt,
            model=llm_gpt_4o  # Already configured with gpt-4o-mini in utils.py
        )
        
        # Run with tracing disabled for speed
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
    Execute an LLM decision on the page (optimized).
    
    Args:
        page: Playwright page object
        decision: LLM decision to execute
    """
    try:
        if decision.action == PlaywrightAction.CLICK:
            # Just try to click - faster than pre-checking
            # Playwright will wait for element automatically
            await page.click(decision.selector, timeout=5000)
        
        elif decision.action == PlaywrightAction.HOVER:
            # Reduced timeout for speed
            await page.hover(decision.selector, timeout=2000)
        
        elif decision.action == PlaywrightAction.TYPE:
            if decision.text_to_type:
                await page.fill(decision.selector, decision.text_to_type, timeout=3000)
        
        elif decision.action == PlaywrightAction.WAIT:
            # Reduced wait time
            await page.wait_for_timeout(500)
        
        else:
            print(f"Unknown action: {decision.action}")
    
    except Exception as e:
        print(f"Error executing {decision.action} on {decision.selector}: {e}")
        # Don't raise - let agent continue and try to recover
        pass


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


# ============================================================================
# Plan-Then-Execute: Screen Planner
# ============================================================================

async def plan_screen(
    persona_name: str,
    persona_description: str,
    persona_goals: list[str],
    persona_pain_points: list[str],
    screen_summary: ScreenSummary
) -> ScreenPlan:
    """
    Generate a plan for a single screen using LLM.
    
    Args:
        persona_name: Name of the persona
        persona_description: Description of the persona
        persona_goals: List of persona goals (first 2 used)
        persona_pain_points: List of persona pain points (first 2 used)
        screen_summary: Current screen state
    
    Returns:
        ScreenPlan with ordered actions for this screen
    """
    # Short system prompt
    system_prompt = f"""You are {persona_name}, {persona_description}.
Goals: {'; '.join(persona_goals[:2])}
Pain points: {'; '.join(persona_pain_points[:2])}

Generate a JSON plan of actions for this screen. Each action needs reasoning."""

    # Build elements list (limit to 15 for speed)
    elements_list = '\n'.join([
        f"{i+1}. \"{el.get('label', el.get('id', ''))[:30]}\" (id: {el['id']})"
        for i, el in enumerate(screen_summary.available_elements[:15])
    ])

    # User prompt with JSON schema
    user_prompt = f"""Screen: {screen_summary.screen_id}
Title: {screen_summary.title}

Elements:
{elements_list}

Generate a JSON plan:
{{
  "actions": [
    {{"action":"CLICK|HOVER|TYPE|WAIT","selector":"[data-element-id='id-here']","reasoning":"brief first-person thought","value":"optional text if TYPE"}},
    ...
  ]
}}

Use exact selectors from list. Keep plan short (2-5 actions for this screen only)."""

    try:
        from agents import Runner, Agent, RunConfig
        
        # Create planning agent
        planner_agent = Agent(
            name='screen_planner',
            instructions=system_prompt,
            model=llm_gpt_4o  # Already gpt-4o-mini
        )
        
        # Get plan from LLM
        result = await Runner.run(
            planner_agent,
            input=user_prompt,
            run_config=RunConfig(tracing_disabled=True)
        )
        
        response_text = result.final_output
        
        # Extract JSON
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        # Parse JSON
        import json
        plan_dict = json.loads(response_text)
        
        # Convert to PlanAction objects
        actions = []
        for action_dict in plan_dict.get('actions', []):
            action_str = action_dict.get('action', 'WAIT').upper()
            
            # Map to PlaywrightAction
            try:
                action = PlaywrightAction[action_str]
            except KeyError:
                print(f"Unknown action '{action_str}', defaulting to WAIT")
                action = PlaywrightAction.WAIT
            
            actions.append(PlanAction(
                action=action,
                selector=action_dict.get('selector', 'body'),
                reasoning=action_dict.get('reasoning', 'Continuing flow'),
                value=action_dict.get('value')
            ))
        
        return ScreenPlan(
            screen_id=screen_summary.screen_id,
            actions=actions
        )
    
    except Exception as e:
        print(f"Error generating screen plan: {e}")
        # Fallback: simple wait action
        return ScreenPlan(
            screen_id=screen_summary.screen_id,
            actions=[
                PlanAction(
                    action=PlaywrightAction.WAIT,
                    selector='body',
                    reasoning='Waiting to assess the situation due to planning error.'
                )
            ]
        )


# ============================================================================
# Full-Flow Planner (Single LLM call for entire flow)
# ============================================================================

async def plan_full_flow(
    persona_name: str,
    persona_description: str,
    persona_goals: list[str],
    persona_pain_points: list[str],
    flow_description: str,
    expected_screens: list[str],
    initial_screen_summary: ScreenSummary
) -> FullFlowPlan:
    """
    Generate a complete plan for the entire flow with a single LLM call.
    
    This is faster (1 LLM call vs 4-5) but less adaptive to unexpected UI changes.
    
    Args:
        persona_name: Name of the persona
        persona_description: Description of the persona
        persona_goals: List of persona goals
        persona_pain_points: List of persona pain points
        flow_description: High-level description of the flow
        expected_screens: Expected screen IDs in order
        initial_screen_summary: Summary of the first screen
    
    Returns:
        FullFlowPlan with ordered actions for entire flow
    """
    # System prompt
    system_prompt = f"""You are {persona_name}, {persona_description}.
Goals: {'; '.join(persona_goals[:2])}
Pain points: {'; '.join(persona_pain_points[:2])}

Generate a complete JSON plan for the ENTIRE flow. This is a multi-screen onboarding flow.
You need to plan actions that will take you through all screens from start to finish.

Each action needs reasoning and should specify which screen it's for."""

    # Build initial elements list
    elements_list = '\n'.join([
        f"{i+1}. \"{el.get('label', el.get('id', ''))[:30]}\" (id: {el['id']})"
        for i, el in enumerate(initial_screen_summary.available_elements[:15])
    ])

    # User prompt with flow context
    user_prompt = f"""Flow: {flow_description}

Expected screens: {' → '.join(expected_screens)}

Initial screen ({initial_screen_summary.screen_id}):
Title: {initial_screen_summary.title}
Elements:
{elements_list}

Generate a JSON plan for the COMPLETE flow:
{{
  "actions": [
    {{"screen":"step-0","action":"CLICK|HOVER|TYPE|WAIT","selector":"[data-element-id='id-here']","reasoning":"brief first-person thought","value":"optional text if TYPE"}},
    {{"screen":"step-0","action":"CLICK","selector":"[data-element-id='continue-btn']","reasoning":"moving to next screen"}},
    {{"screen":"step-1","action":"CLICK","selector":"[data-element-id='option-1']","reasoning":"..."}},
    // ... continue planning through all screens to completion
  ]
}}

Important:
1. Use exact format: [data-element-id='id-here']
2. Continue buttons follow pattern: step0-continue, step1-continue, step2-continue, step3-continue
3. Back buttons follow pattern: step1-back, step2-back, step3-back
4. Goal options: goal-option-balance, goal-option-maximize, goal-option-optimize
5. For elements you haven't seen, use simple IDs or use WAIT to pause
6. Plan 8-12 actions total (keep it simple)
7. Focus on navigation between screens rather than trying to guess all element IDs"""

    try:
        from agents import Runner, Agent, RunConfig
        
        # Create planning agent
        planner_agent = Agent(
            name='full_flow_planner',
            instructions=system_prompt,
            model=llm_gpt_4o
        )
        
        # Get plan from LLM
        result = await Runner.run(
            planner_agent,
            input=user_prompt,
            run_config=RunConfig(tracing_disabled=True)
        )
        
        response_text = result.final_output
        
        # Extract JSON
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        # Parse JSON
        import json
        plan_dict = json.loads(response_text)
        
        # Convert to PlanAction objects
        actions = []
        for action_dict in plan_dict.get('actions', []):
            action_str = action_dict.get('action', 'WAIT').upper()
            
            # Map to PlaywrightAction
            try:
                action = PlaywrightAction[action_str]
            except KeyError:
                print(f"Unknown action '{action_str}', defaulting to WAIT")
                action = PlaywrightAction.WAIT
            
            actions.append(PlanAction(
                action=action,
                selector=action_dict.get('selector', 'body'),
                reasoning=action_dict.get('reasoning', 'Continuing flow'),
                value=action_dict.get('value')
            ))
        
        print(f"[Full Flow Planner] Generated plan with {len(actions)} actions across {len(expected_screens)} screens")
        
        return FullFlowPlan(
            flow_id='onboarding-v1',
            actions=actions,
            expected_screens=expected_screens
        )
    
    except Exception as e:
        print(f"Error generating full flow plan: {e}")
        # Fallback: minimal plan to at least try
        return FullFlowPlan(
            flow_id='onboarding-v1',
            actions=[
                PlanAction(
                    action=PlaywrightAction.WAIT,
                    selector='body',
                    reasoning='Waiting due to planning error. Need to assess manually.'
                )
            ],
            expected_screens=expected_screens
        )

