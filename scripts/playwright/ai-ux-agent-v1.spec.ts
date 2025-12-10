/**
 * POC 2: LLM-Driven Playwright Test for AI UX Agent Persona
 * 
 * This test uses an LLM (Claude) to dynamically decide actions based on the
 * AI UX Agent persona characteristics. Actions and reasoning are captured in real-time.
 * 
 * Outputs:
 * - Video recording
 * - Playwright trace
 * - events.json (with LLM-generated reasoning)
 * - metadata.json (run metadata)
 */

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventLogger } from '../../lib/playwright/EventLogger';
import { runLLMPersonaFlow } from '../../lib/playwright/llm-agent';
import { getPersonaById } from '../../lib/data/personas';
import type { PlaywrightRunMetadata } from '../../lib/playwright/types';

const RUN_ID = `run-llm-${Date.now()}`;
const PERSONA_ID = 'ai-ux-agent'; // This should be added to personas.ts
const SCENARIO_ID = 'onboarding';
const UI_VERSION = 'v1';

test.describe('AI UX Agent on V1 Onboarding (LLM-Driven)', () => {
  let logger: EventLogger;
  let runStartTime: number;
  let outputDir: string;

  test.beforeEach(async () => {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('\n⚠️  Warning: ANTHROPIC_API_KEY not set. Test will fail.\n');
      console.warn('Set it in .env.local or run with:');
      console.warn('ANTHROPIC_API_KEY=your-key npm run playwright:test\n');
    }

    // Initialize event logger
    logger = new EventLogger(RUN_ID, PERSONA_ID);
    runStartTime = Date.now();

    // Create output directory
    outputDir = join(process.cwd(), 'playwright-runs', RUN_ID);
    mkdirSync(outputDir, { recursive: true });

    console.log(`\n🤖 Starting LLM-driven run: ${RUN_ID}`);
    console.log(`   Persona: ${PERSONA_ID}`);
    console.log(`   UI Version: ${UI_VERSION}`);
    console.log(`   Mode: llm-driven`);
    console.log(`   Output: ${outputDir}\n`);
  });

  test('Complete onboarding flow with LLM decisions', async ({ page }, testInfo) => {
    // Load persona (or use a default AI UX Agent persona)
    const persona = getPersonaById(PERSONA_ID) || {
      id: PERSONA_ID,
      name: 'AI UX Agent',
      avatarColor: '#6366f1',
      description: 'An autonomous AI agent that tests user interfaces systematically',
      goals: [
        'Evaluate UI clarity and usability',
        'Identify confusing or ambiguous elements',
        'Complete tasks efficiently while noting friction points',
      ],
      preferences: [
        'Clear labeling and visual hierarchy',
        'Consistent interaction patterns',
        'Obvious primary actions',
      ],
      painPoints: [
        'Ambiguous or jargon-heavy copy',
        'Unclear button purposes',
        'Poor visual hierarchy',
      ],
      tone: 'Analytical and objective. Notes observations clearly and directly.',
    };

    // Navigate to app
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    console.log('\n🧠 Starting LLM-driven flow...\n');

    // Run LLM-driven persona flow
    const decisions = await runLLMPersonaFlow(
      page,
      persona,
      20, // max steps
      process.env.ANTHROPIC_API_KEY
    );

    console.log(`\n✓ LLM flow completed with ${decisions.length} decisions\n`);

    // Log all decisions to EventLogger
    for (const [index, decision] of decisions.entries()) {
      await logger.logAction(
        decision.action,
        decision.selector,
        decision.reasoning,
        decision.status || 'success',
        page
      );
    }

    console.log(`✓ Logged ${logger.getEventCount()} events\n`);

    // Verify we completed the flow (optional)
    // Could check for completion screen or specific elements
    await page.waitForTimeout(1000);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const runEndTime = Date.now();
    const durationMs = runEndTime - runStartTime;

    // Save events.json
    const eventsPath = join(outputDir, 'events.json');
    logger.save(eventsPath);

    // Get video path
    const video = await page.video();
    const videoPath = video ? await video.path() : undefined;

    // Copy video to our output directory if it exists
    if (videoPath) {
      const fs = require('fs');
      const targetVideoPath = join(outputDir, 'video.webm');
      fs.copyFileSync(videoPath, targetVideoPath);
      console.log(`✓ Video saved to: ${targetVideoPath}`);
    }

    // Get trace path
    const tracePath = join(
      process.cwd(),
      'playwright-runs/test-results',
      testInfo.testId,
      'trace.zip'
    );

    // Create metadata.json
    const metadata: PlaywrightRunMetadata = {
      runId: RUN_ID,
      personaId: PERSONA_ID,
      scenarioId: SCENARIO_ID,
      uiVersion: UI_VERSION,
      mode: 'llm-driven',
      appUrl: page.url(),
      status: testInfo.status === 'passed' ? 'completed' : 'failed',
      startedAt: new Date(runStartTime).toISOString(),
      completedAt: new Date(runEndTime).toISOString(),
      durationMs,
      videoPath: videoPath ? `playwright-runs/${RUN_ID}/video.webm` : undefined,
      tracePath: `playwright-runs/test-results/${testInfo.testId}/trace.zip`,
      eventsPath: `playwright-runs/${RUN_ID}/events.json`,
      error: testInfo.error?.message,
      source: 'playwright-mcp',
      metadata: {
        browser: testInfo.project.name,
        playwrightVersion: testInfo.config.version || 'unknown',
        llmModel: 'claude-3-5-sonnet-20241022',
        eventCount: logger.getEventCount(),
      },
    };

    const metadataPath = join(outputDir, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✓ Metadata saved to: ${metadataPath}`);

    console.log(`\n📊 Run Summary:`);
    console.log(`   Run ID: ${RUN_ID}`);
    console.log(`   Mode: LLM-driven`);
    console.log(`   Status: ${metadata.status}`);
    console.log(`   Duration: ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`   Events: ${logger.getEventCount()}`);
    console.log(`   LLM Model: claude-3-5-sonnet-20241022`);
    console.log(`   Output Dir: ${outputDir}\n`);
  });
});

