/**
 * LLM Agent Integration for Playwright POC 2
 * 
 * Provides LLM-driven decision making for AI/UX agent personas.
 * Uses Anthropic's Claude to generate actions and reasoning in real-time.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Page } from '@playwright/test';
import type { Persona } from '../types';
import type { LLMDecision, PageState, EventStatus, PlaywrightAction } from './types';

/**
 * Extract current page state for LLM context
 */
export async function extractPageState(page: Page): Promise<PageState> {
  // Get available interactive elements with data-element-id
  const availableElements = await page.$$eval('[data-element-id]', (els) =>
    els.map((el) => ({
      id: el.getAttribute('data-element-id') || '',
      text: el.textContent?.trim().substring(0, 100) || '',
      type: el.tagName.toLowerCase(),
      selector: `[data-element-id="${el.getAttribute('data-element-id')}"]`,
    }))
  );

  // Get page content
  const pageContent = await page.evaluate(() => ({
    title: document.title,
    url: window.location.href,
    visibleText: document.body.innerText.substring(0, 800),
  }));

  // Try to determine screen ID
  const screenId = await page
    .$eval('[data-screen-id]', (el) => el.getAttribute('data-screen-id'))
    .catch(() => undefined) || undefined;

  return {
    ...pageContent,
    availableElements,
    screenId,
  };
}

/**
 * Get LLM decision for next action
 */
export async function getLLMDecision(
  persona: Persona,
  pageState: PageState,
  apiKey?: string
): Promise<LLMDecision> {
  const anthropic = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `You are ${persona.name}, ${persona.description}.

Your characteristics:
- Goals: ${persona.goals.join('; ')}
- Preferences: ${persona.preferences.join('; ')}
- Pain Points: ${persona.painPoints.join('; ')}
- Tone: ${persona.tone}

You are testing a web application's user interface. At each step, observe what's on the screen and decide what action to take next based on your personality, goals, and pain points.

Think like a real user with your specific characteristics. Express confusion when things are unclear, delight when things work well, and frustration when blocked.`;

  const userPrompt = `Current page state:

Title: ${pageState.title}
URL: ${pageState.url}
Screen: ${pageState.screenId || 'unknown'}

Visible text on page (truncated):
${pageState.visibleText}

Available interactive elements:
${pageState.availableElements
  .map((el, i) => `${i + 1}. [${el.type}] "${el.text}" (id: ${el.id})`)
  .join('\n')}

What do you do next? Consider your goals, preferences, and pain points.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "action": "CLICK" | "HOVER" | "TYPE" | "WAIT",
  "selector": "[data-element-id='exact-id-here']",
  "reasoning": "Your first-person thought process explaining why (1-2 sentences)",
  "status": "success" | "confused" | "blocked" | "delighted",
  "shouldContinue": true | false,
  "textToType": "optional - only if action is TYPE"
}

Important:
- Use EXACTLY one of the selectors from the available elements list
- Keep reasoning conversational and in-character
- Set shouldContinue to false if you've completed the flow or are stuck
- Match status to your emotional state (confused if unclear, delighted if pleasant)`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textContent =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    const decision = JSON.parse(textContent) as LLMDecision;

    // Validate decision
    if (!decision.action || !decision.selector || !decision.reasoning) {
      throw new Error('LLM response missing required fields');
    }

    return decision;
  } catch (error) {
    console.error('Error getting LLM decision:', error);
    
    // Fallback: safe wait action
    return {
      action: 'WAIT',
      selector: 'body',
      reasoning: 'I need a moment to think about what to do next.',
      status: 'confused',
      shouldContinue: false,
    };
  }
}

/**
 * Execute an LLM decision on the page
 */
export async function executeLLMDecision(
  page: Page,
  decision: LLMDecision
): Promise<void> {
  const { action, selector, textToType } = decision;

  try {
    switch (action) {
      case 'CLICK':
        await page.click(selector, { timeout: 5000 });
        break;

      case 'HOVER':
        await page.hover(selector, { timeout: 5000 });
        break;

      case 'TYPE':
        if (textToType) {
          await page.type(selector, textToType, { timeout: 5000 });
        }
        break;

      case 'WAIT':
        await page.waitForTimeout(1000);
        break;

      default:
        console.warn(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error executing ${action} on ${selector}:`, error);
    throw error;
  }
}

/**
 * Run a complete LLM-driven persona flow
 */
export async function runLLMPersonaFlow(
  page: Page,
  persona: Persona,
  maxSteps: number = 20,
  apiKey?: string
): Promise<LLMDecision[]> {
  const decisions: LLMDecision[] = [];

  for (let step = 0; step < maxSteps; step++) {
    console.log(`\n[LLM Agent] Step ${step + 1}/${maxSteps}`);

    // Wait for page to settle
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(500);

    // Extract page state
    const pageState = await extractPageState(page);
    console.log(`[LLM Agent] Screen: ${pageState.screenId || 'unknown'}`);
    console.log(
      `[LLM Agent] Available elements: ${pageState.availableElements.length}`
    );

    // Get LLM decision
    console.log(`[LLM Agent] Asking LLM for decision...`);
    const decision = await getLLMDecision(persona, pageState, apiKey);
    decisions.push(decision);

    console.log(`[LLM Agent] Decision: ${decision.action} ${decision.selector}`);
    console.log(`[LLM Agent] Reasoning: "${decision.reasoning}"`);
    console.log(`[LLM Agent] Status: ${decision.status}`);

    // Check if should continue
    if (!decision.shouldContinue) {
      console.log(`[LLM Agent] Flow complete (shouldContinue=false)`);
      break;
    }

    // Execute decision
    try {
      await executeLLMDecision(page, decision);
      console.log(`[LLM Agent] ✓ Action executed successfully`);
    } catch (error) {
      console.error(`[LLM Agent] ✗ Action failed:`, error);
      // Continue anyway - LLM might recover
    }

    // Small delay between actions
    await page.waitForTimeout(1000);
  }

  console.log(`\n[LLM Agent] Flow completed with ${decisions.length} steps\n`);
  return decisions;
}

