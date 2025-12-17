/**
 * Frontend API client for Python Playwright backend
 * 
 * This module provides functions to interact with the FastAPI backend
 * for triggering and managing Playwright UX testing runs.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export type UIVersion = 'v1' | 'v2';
export type RunMode = 'scripted' | 'llm-driven';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface StartRunRequest {
  persona_id: string;
  scenario_id: string;
  ui_version: UIVersion;
  mode: RunMode;
  headless?: boolean;
  max_steps?: number;
}

export interface StartRunResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface RunMetadata {
  run_id: string;
  persona_id: string;
  scenario_id: string;
  ui_version: UIVersion;
  mode: RunMode;
  app_url: string;
  status: RunStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  video_path?: string;
  trace_path?: string;
  events_path?: string;
  error?: string;
  metadata?: {
    browser?: string;
    headless?: boolean;
    llm_model?: string;
    eventCount?: number;
  };
}

export interface PlaywrightEvent {
  run_id: string;
  persona_id: string;
  step_index: number;
  screen_id?: string;
  target_selector: string;
  target_element_id?: string;
  action: string;
  reasoning_text: string;
  status: string;
  timestamp: number;
  duration_ms?: number;
  elapsed?: number; // Elapsed time in seconds since run start
}

export interface RunEventsResponse {
  run_id: string;
  events: PlaywrightEvent[];
}

export interface RunListItem {
  run_id: string;
  persona_id: string;
  mode: RunMode;
  status: RunStatus;
  started_at: string;
  duration_ms?: number;
}

/**
 * Start a new Playwright run
 */
export async function startPlaywrightRun(request: StartRunRequest): Promise<StartRunResponse> {
  const response = await fetch(`${BACKEND_URL}/playwright/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to start run: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List all completed runs
 */
export async function listPlaywrightRuns(): Promise<RunListItem[]> {
  const response = await fetch(`${BACKEND_URL}/playwright/runs`);

  if (!response.ok) {
    throw new Error(`Failed to list runs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.runs;
}

/**
 * Get metadata for a specific run
 */
export async function getPlaywrightRunMetadata(runId: string): Promise<RunMetadata> {
  const response = await fetch(`${BACKEND_URL}/playwright/runs/${runId}`);

  if (!response.ok) {
    throw new Error(`Failed to get run metadata: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get events for a specific run
 */
export async function getPlaywrightRunEvents(runId: string): Promise<PlaywrightEvent[]> {
  const response = await fetch(`${BACKEND_URL}/playwright/runs/${runId}/events`);

  if (!response.ok) {
    throw new Error(`Failed to get run events: ${response.statusText}`);
  }

  const data: RunEventsResponse = await response.json();
  return data.events;
}

/**
 * Get video URL for a specific run
 */
export function getPlaywrightRunVideoUrl(runId: string): string {
  return `${BACKEND_URL}/playwright/runs/${runId}/video`;
}

/**
 * Get trace URL for a specific run
 */
export function getPlaywrightRunTraceUrl(runId: string): string {
  return `${BACKEND_URL}/playwright/runs/${runId}/trace`;
}

/**
 * Delete a run and all its artifacts
 */
export async function deletePlaywrightRun(runId: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/playwright/runs/${runId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete run: ${response.statusText}`);
  }
}

/**
 * Poll for run completion
 * 
 * @param runId - The run ID to poll
 * @param onProgress - Callback for progress updates
 * @param intervalMs - Polling interval in milliseconds (default: 2000)
 * @param timeoutMs - Timeout in milliseconds (default: 300000 = 5 minutes)
 * @returns Promise that resolves when run is complete
 */
export async function pollPlaywrightRunCompletion(
  runId: string,
  onProgress?: (metadata: RunMetadata) => void,
  intervalMs: number = 2000,
  timeoutMs: number = 300000
): Promise<RunMetadata> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Run polling timeout'));
          return;
        }

        // Get current status
        const metadata = await getPlaywrightRunMetadata(runId);

        // Call progress callback
        if (onProgress) {
          onProgress(metadata);
        }

        // Check if complete
        if (metadata.status === 'completed') {
          resolve(metadata);
          return;
        }

        if (metadata.status === 'failed') {
          reject(new Error(metadata.error || 'Run failed'));
          return;
        }

        // Still running, schedule next poll
        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Helper: Start a run and wait for completion
 */
export async function startAndWaitForPlaywrightRun(
  request: StartRunRequest,
  onProgress?: (metadata: RunMetadata) => void
): Promise<{ metadata: RunMetadata; events: PlaywrightEvent[] }> {
  // Start the run
  const { run_id } = await startPlaywrightRun(request);

  // Wait for completion
  const metadata = await pollPlaywrightRunCompletion(run_id, onProgress);

  // Get events
  const events = await getPlaywrightRunEvents(run_id);

  return { metadata, events };
}

