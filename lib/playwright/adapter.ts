/**
 * Playwright to Mimica TKF Adapter
 * 
 * Converts Playwright run data (events.json, metadata.json) into
 * Mimica's SimulationStep format for integration with TKF aggregator.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { SimulationStep } from '../types';
import type {
  PlaywrightEvent,
  PlaywrightRunMetadata,
  PlaywrightRun,
  PlaywrightAdapterResult,
} from './types';

/**
 * Load a Playwright run from disk
 */
export function loadPlaywrightRun(runId: string, baseDir: string = 'playwright-runs'): PlaywrightRun {
  const runDir = join(process.cwd(), baseDir, runId);

  // Load metadata
  const metadataPath = join(runDir, 'metadata.json');
  const metadata: PlaywrightRunMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

  // Load events
  const eventsPath = join(runDir, 'events.json');
  const events: PlaywrightEvent[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));

  return {
    metadata,
    events,
  };
}

/**
 * Convert a single PlaywrightEvent to SimulationStep
 */
export function convertEventToStep(event: PlaywrightEvent): SimulationStep {
  // Map Playwright actions to SimulationAction (filter out unsupported actions)
  const validActions: Set<string> = new Set(['CLICK', 'TYPE', 'NAVIGATE', 'HOVER', 'WAIT']);
  const action = validActions.has(event.action) ? event.action : 'CLICK';
  
  return {
    stepIndex: event.stepIndex,
    personaId: event.personaId,
    screenId: event.screenId || 'unknown',
    action: action as import('../types').SimulationAction,
    targetElementId: event.targetElementId || event.targetSelector,
    reasoningText: event.reasoningText,
    status: event.status,
    durationMs: event.durationMs,
  };
}

/**
 * Convert all Playwright events to SimulationSteps
 */
export function convertEventsToSteps(events: PlaywrightEvent[]): SimulationStep[] {
  return events.map(convertEventToStep);
}

/**
 * Adapter to convert a complete Playwright run for TKF consumption
 */
export function adaptPlaywrightRunForTKF(
  runId: string,
  baseDir: string = 'playwright-runs'
): PlaywrightAdapterResult {
  // Load run data
  const run = loadPlaywrightRun(runId, baseDir);

  // Convert events to steps
  const steps = convertEventsToSteps(run.events);

  // Compute video path (absolute or relative)
  const videoPath = run.metadata.videoPath
    ? join(process.cwd(), run.metadata.videoPath)
    : undefined;

  return {
    steps,
    metadata: run.metadata,
    videoPath,
  };
}

/**
 * List all available Playwright runs
 */
export function listPlaywrightRuns(baseDir: string = 'playwright-runs'): PlaywrightRunMetadata[] {
  const fs = require('fs');
  const runsDir = join(process.cwd(), baseDir);

  // Check if directory exists
  if (!fs.existsSync(runsDir)) {
    return [];
  }

  // Read all subdirectories
  const entries = fs.readdirSync(runsDir, { withFileTypes: true });
  const runs: PlaywrightRunMetadata[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('run-')) {
      const metadataPath = join(runsDir, entry.name, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata: PlaywrightRunMetadata = JSON.parse(
            fs.readFileSync(metadataPath, 'utf-8')
          );
          runs.push(metadata);
        } catch (error) {
          console.warn(`Failed to load metadata for ${entry.name}:`, error);
        }
      }
    }
  }

  // Sort by startedAt (newest first)
  return runs.sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Get a summary of available Playwright runs grouped by persona
 */
export function getPlaywrightRunsSummary(baseDir: string = 'playwright-runs') {
  const runs = listPlaywrightRuns(baseDir);

  const summary: Record<string, {
    personaId: string;
    runs: Array<{
      runId: string;
      uiVersion: string;
      mode: string;
      status: string;
      startedAt: string;
      durationMs?: number;
    }>;
  }> = {};

  for (const run of runs) {
    if (!summary[run.personaId]) {
      summary[run.personaId] = {
        personaId: run.personaId,
        runs: [],
      };
    }

    summary[run.personaId].runs.push({
      runId: run.runId,
      uiVersion: run.uiVersion,
      mode: run.mode,
      status: run.status,
      startedAt: run.startedAt,
      durationMs: run.durationMs,
    });
  }

  return summary;
}

