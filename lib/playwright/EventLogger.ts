/**
 * EventLogger
 * 
 * Utility class for logging Playwright events during test execution.
 * Generates events.json compatible with our PlaywrightEvent schema.
 */

import { writeFileSync } from 'fs';
import { Page } from '@playwright/test';
import type {
  PlaywrightEvent,
  PlaywrightAction,
  EventStatus,
} from './types';

export class EventLogger {
  private events: PlaywrightEvent[] = [];
  private runId: string;
  private personaId: string;

  constructor(runId: string, personaId: string) {
    this.runId = runId;
    this.personaId = personaId;
  }

  /**
   * Log an action performed during the test
   */
  async logAction(
    action: PlaywrightAction,
    selector: string,
    reasoningText: string,
    status: EventStatus = 'success',
    page?: Page
  ): Promise<void> {
    const startTime = Date.now();

    // Extract element ID from selector if possible
    const elementId = await this.extractElementId(selector, page);

    // Try to determine screen ID from page
    const screenId = page ? await this.extractScreenId(page) : undefined;

    const event: PlaywrightEvent = {
      runId: this.runId,
      personaId: this.personaId,
      stepIndex: this.events.length,
      screenId,
      targetSelector: selector,
      targetElementId: elementId,
      action,
      reasoningText,
      status,
      timestamp: startTime,
    };

    this.events.push(event);
    
    // Log to console for real-time feedback
    console.log(`[${this.personaId}] Step ${event.stepIndex}: ${action} ${elementId || selector} - "${reasoningText}"`);
  }

  /**
   * Update the duration of the last logged event
   */
  updateLastEventDuration(durationMs: number): void {
    if (this.events.length > 0) {
      this.events[this.events.length - 1].durationMs = durationMs;
    }
  }

  /**
   * Extract data-element-id attribute from selector
   */
  private async extractElementId(
    selector: string,
    page?: Page
  ): Promise<string | undefined> {
    // Try to extract from selector string first
    const match = selector.match(/data-element-id=["']([^"']+)["']/);
    if (match) {
      return match[1];
    }

    // If page is available, try to query the actual element
    if (page) {
      try {
        const elementId = await page.$eval(selector, (el) =>
          el.getAttribute('data-element-id')
        ).catch(() => null);
        return elementId || undefined;
      } catch {
        // Element not found or no data-element-id, fall back to selector
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * Try to determine current screen/step ID from page
   */
  private async extractScreenId(page: Page): Promise<string | undefined> {
    try {
      // Look for data-screen-id attribute
      const screenId = await page.$eval('[data-screen-id]', (el) =>
        el.getAttribute('data-screen-id')
      ).catch(() => null);

      if (screenId) {
        return screenId;
      }

      // Fallback: try to infer from URL or title
      const url = page.url();
      const pathMatch = url.match(/step-(\d+)/);
      if (pathMatch) {
        return `step-${pathMatch[1]}`;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get all logged events
   */
  getEvents(): PlaywrightEvent[] {
    return [...this.events];
  }

  /**
   * Get number of events logged
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Save events to JSON file
   */
  save(outputPath: string): void {
    writeFileSync(outputPath, JSON.stringify(this.events, null, 2), 'utf-8');
    console.log(`✓ Events saved to: ${outputPath}`);
  }

  /**
   * Clear all events (for re-runs)
   */
  clear(): void {
    this.events = [];
  }
}

