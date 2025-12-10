/**
 * POC 1: Scripted Playwright Test for Gen Z Creator Persona on V1 UI
 * 
 * This test replicates the existing scripted sequence from
 * lib/data/simulation-sequences.ts but runs in a real browser with Playwright.
 * 
 * Outputs:
 * - Video recording
 * - Playwright trace
 * - events.json (our custom event log)
 * - metadata.json (run metadata)
 */

import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventLogger } from '../../lib/playwright/EventLogger';
import type { PlaywrightRunMetadata } from '../../lib/playwright/types';

const RUN_ID = `run-${Date.now()}`;
const PERSONA_ID = 'gen-z-creator';
const SCENARIO_ID = 'onboarding';
const UI_VERSION = 'v1';

test.describe('Gen Z Creator on V1 Onboarding', () => {
  let logger: EventLogger;
  let runStartTime: number;
  let outputDir: string;

  test.beforeEach(async () => {
    // Initialize event logger
    logger = new EventLogger(RUN_ID, PERSONA_ID);
    runStartTime = Date.now();

    // Create output directory
    outputDir = join(process.cwd(), 'playwright-runs', RUN_ID);
    mkdirSync(outputDir, { recursive: true });

    console.log(`\n🎭 Starting run: ${RUN_ID}`);
    console.log(`   Persona: ${PERSONA_ID}`);
    console.log(`   UI Version: ${UI_VERSION}`);
    console.log(`   Output: ${outputDir}\n`);
  });

  test('Complete onboarding flow as Gen Z Creator', async ({ page }, testInfo) => {
    // Navigate to app
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Step 0: Initial observation and confusion about goals
    await logger.logAction(
      'HOVER',
      '[data-element-id="goal-option-maximize"]',
      'Hmm, "Maximize Output"... what does that even mean? Is that like, work harder?',
      'confused',
      page
    );
    await page.hover('[data-element-id="goal-option-maximize"]');
    await page.waitForTimeout(2000);

    await logger.logAction(
      'HOVER',
      '[data-element-id="goal-option-optimize"]',
      '"Optimize Workflow" vs "Maximize Output"... these sound like the same thing?',
      'confused',
      page
    );
    await page.hover('[data-element-id="goal-option-optimize"]');
    await page.waitForTimeout(2500);

    // Step 1: Choose balance option
    await logger.logAction(
      'CLICK',
      '[data-element-id="goal-option-balance"]',
      'I guess "Equilibrium Mode" makes the most sense, even though the wording is weird.',
      'success',
      page
    );
    await page.click('[data-element-id="goal-option-balance"]');
    await page.waitForTimeout(1000);

    // Step 2: Continue to next step
    await logger.logAction(
      'CLICK',
      '[data-element-id="step0-continue"]',
      'Okay, moving on.',
      'success',
      page
    );
    await page.click('[data-element-id="step0-continue"]');
    await page.waitForTimeout(500);

    // Step 3: Engagement Mode confusion
    await logger.logAction(
      'WAIT',
      '[data-element-id="engagement-intensity-slider"]',
      'Wait, what? "Engagement Mode"? "Interaction paradigm"? This is so vague.',
      'confused',
      page
    );
    await page.waitForTimeout(3000);

    await logger.logAction(
      'CLICK',
      '[data-element-id="engagement-intensity-slider"]',
      'I\'ll just move this slider to the middle I guess?',
      'confused',
      page
    );
    // Interact with slider
    const slider = await page.locator('[data-element-id="engagement-intensity-slider"]');
    await slider.click();
    await page.waitForTimeout(1500);

    // Step 4: Button hierarchy confusion
    await logger.logAction(
      'HOVER',
      '[data-element-id="step1-continue"]',
      'Where\'s the main button? Oh, "Next Step" is not even highlighted...',
      'confused',
      page
    );
    await page.hover('[data-element-id="step1-continue"]');
    await page.waitForTimeout(2000);

    await logger.logAction(
      'CLICK',
      '[data-element-id="step1-continue"]',
      'Finally found it.',
      'success',
      page
    );
    await page.click('[data-element-id="step1-continue"]');
    await page.waitForTimeout(800);

    // Step 5: Notifications screen
    await logger.logAction(
      'WAIT',
      '[data-element-id="notification-updates"]',
      'Okay, notifications. Let me just check the important ones.',
      'success',
      page
    );
    await page.waitForTimeout(1000);

    await logger.logAction(
      'CLICK',
      '[data-element-id="notification-updates"]',
      'System updates, sure.',
      'success',
      page
    );
    await page.click('[data-element-id="notification-updates"]');
    await page.waitForTimeout(500);

    // Step 6: Confusing button layout
    await logger.logAction(
      'HOVER',
      '[data-element-id="step2-skip"]',
      'Wait, is "Skip" the main button here? That doesn\'t make sense...',
      'confused',
      page
    );
    await page.hover('[data-element-id="step2-skip"]');
    await page.waitForTimeout(2500);

    // Step 7: Accidentally click back
    await logger.logAction(
      'CLICK',
      '[data-element-id="step2-back"]',
      'I\'ll click "Previous" to continue? This layout is confusing.',
      'confused',
      page
    );
    await page.click('[data-element-id="step2-back"]');
    await page.waitForTimeout(1000);

    // Step 8: Realize mistake
    await logger.logAction(
      'WAIT',
      '[data-element-id="step1-continue"]',
      'Oh no, I went back. Let me go forward again.',
      'blocked',
      page
    );
    await page.waitForTimeout(1500);

    // Step 9: Go forward again
    await logger.logAction(
      'CLICK',
      '[data-element-id="step1-continue"]',
      'Going forward again...',
      'success',
      page
    );
    await page.click('[data-element-id="step1-continue"]');
    await page.waitForTimeout(500);

    // Step 10: Skip notifications
    await logger.logAction(
      'CLICK',
      '[data-element-id="step2-skip"]',
      'Let me just skip this.',
      'success',
      page
    );
    await page.click('[data-element-id="step2-skip"]');
    await page.waitForTimeout(800);

    // Step 11: Review screen
    await logger.logAction(
      'WAIT',
      '[data-element-id="step3-finish"]',
      'Okay, review screen. Let me finish this.',
      'success',
      page
    );
    await page.waitForTimeout(1000);

    // Step 12: Finish
    await logger.logAction(
      'CLICK',
      '[data-element-id="step3-finish"]',
      'Done! Finally.',
      'success',
      page
    );
    await page.click('[data-element-id="step3-finish"]');
    await page.waitForTimeout(500);

    // Verify completion (optional - could check for success screen)
    await page.waitForTimeout(1000);

    console.log(`\n✓ Test completed with ${logger.getEventCount()} events\n`);
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

    // Get trace path (Playwright saves it automatically)
    // We'll document where it is in metadata
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
      mode: 'scripted',
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
        eventCount: logger.getEventCount(),
      },
    };

    const metadataPath = join(outputDir, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✓ Metadata saved to: ${metadataPath}`);

    console.log(`\n📊 Run Summary:`);
    console.log(`   Run ID: ${RUN_ID}`);
    console.log(`   Status: ${metadata.status}`);
    console.log(`   Duration: ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`   Events: ${logger.getEventCount()}`);
    console.log(`   Output Dir: ${outputDir}\n`);
  });
});

