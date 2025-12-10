/**
 * Playwright Integration Types
 * 
 * Defines data structures for Playwright-driven persona runs,
 * designed to map cleanly to existing SimulationStep types.
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Action types that can be performed in Playwright tests
 */
export type PlaywrightAction = 
  | 'CLICK'
  | 'HOVER'
  | 'TYPE'
  | 'WAIT'
  | 'NAVIGATE'
  | 'SELECT'
  | 'SCROLL';

/**
 * Status of each step/event
 * Matches existing SimulationStep status values
 */
export type EventStatus = 
  | 'success'
  | 'confused'
  | 'blocked'
  | 'delighted';

/**
 * Individual event logged during a Playwright run
 * Maps to SimulationStep in existing codebase
 */
export interface PlaywrightEvent {
  /** Unique ID of the run this event belongs to */
  runId: string;
  
  /** Persona performing this action (e.g., "gen-z-creator") */
  personaId: string;
  
  /** Sequential index of this step in the run */
  stepIndex: number;
  
  /** Screen/page identifier if determinable (e.g., "step-0", "step-1") */
  screenId?: string;
  
  /** CSS/Playwright selector used to find the element */
  targetSelector: string;
  
  /** Human-readable element ID (from data-element-id attribute) */
  targetElementId?: string;
  
  /** Action performed */
  action: PlaywrightAction;
  
  /** First-person reasoning text (from persona or LLM) */
  reasoningText: string;
  
  /** Outcome/emotional state of the persona */
  status: EventStatus;
  
  /** Unix timestamp when action was performed */
  timestamp: number;
  
  /** Duration in milliseconds (optional) */
  durationMs?: number;
  
  /** Any additional metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// Run Metadata
// ============================================================================

/**
 * Execution mode for the run
 */
export type RunMode = 
  | 'scripted'      // POC 1: Fixed sequence of actions
  | 'llm-driven';   // POC 2: LLM decides actions dynamically

/**
 * UI version being tested
 */
export type UIVersion = 'v1' | 'v2';

/**
 * Run status
 */
export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

/**
 * Metadata for a complete Playwright run
 */
export interface PlaywrightRunMetadata {
  /** Unique identifier for this run (e.g., "run-20241210-123456") */
  runId: string;
  
  /** Persona that performed the run */
  personaId: string;
  
  /** Scenario identifier (e.g., "onboarding") */
  scenarioId: string;
  
  /** UI version tested */
  uiVersion: UIVersion;
  
  /** Execution mode used */
  mode: RunMode;
  
  /** URL of the application tested */
  appUrl: string;
  
  /** Current status */
  status: RunStatus;
  
  /** ISO timestamp when run started */
  startedAt: string;
  
  /** ISO timestamp when run completed (if finished) */
  completedAt?: string;
  
  /** Duration in milliseconds */
  durationMs?: number;
  
  /** Relative path to video file */
  videoPath?: string;
  
  /** Relative path to Playwright trace file */
  tracePath?: string;
  
  /** Relative path to events JSON file */
  eventsPath?: string;
  
  /** Error message if run failed */
  error?: string;
  
  /** Source identifier */
  source: 'playwright-mcp';
  
  /** Additional metadata */
  metadata?: {
    /** Browser used (e.g., "chromium") */
    browser?: string;
    /** Playwright version */
    playwrightVersion?: string;
    /** LLM model used (if llm-driven) */
    llmModel?: string;
    /** Number of events recorded */
    eventCount?: number;
  };
}

// ============================================================================
// Complete Run Data
// ============================================================================

/**
 * Complete data for a Playwright run, including metadata and all events
 */
export interface PlaywrightRun {
  /** Run metadata */
  metadata: PlaywrightRunMetadata;
  
  /** All events that occurred during the run */
  events: PlaywrightEvent[];
}

// ============================================================================
// LLM Decision Types (for POC 2)
// ============================================================================

/**
 * Decision made by LLM for next action
 */
export interface LLMDecision {
  /** Action to perform */
  action: PlaywrightAction;
  
  /** Selector to target */
  selector: string;
  
  /** First-person reasoning */
  reasoning: string;
  
  /** Whether to continue the flow */
  shouldContinue: boolean;
  
  /** Optional text to type (if action is TYPE) */
  textToType?: string;
  
  /** Predicted emotional state */
  status?: EventStatus;
}

/**
 * Page state information passed to LLM for decision-making
 */
export interface PageState {
  /** Page title */
  title: string;
  
  /** Current URL */
  url: string;
  
  /** Visible text content (truncated) */
  visibleText: string;
  
  /** Available interactive elements */
  availableElements: Array<{
    id: string;
    text: string;
    type: string;
    selector: string;
  }>;
  
  /** Current screen ID if determinable */
  screenId?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for running a persona flow
 */
export interface PersonaFlowConfig {
  /** Persona to run */
  personaId: string;
  
  /** Scenario to execute */
  scenarioId: string;
  
  /** UI version to test */
  uiVersion: UIVersion;
  
  /** Application URL */
  appUrl: string;
  
  /** Execution mode */
  mode: RunMode;
  
  /** Maximum number of steps before timeout */
  maxSteps?: number;
  
  /** Timeout in milliseconds for each action */
  actionTimeout?: number;
  
  /** Whether to record video */
  recordVideo?: boolean;
  
  /** Whether to capture trace */
  captureTrace?: boolean;
  
  /** Output directory for artefacts */
  outputDir?: string;
  
  /** LLM configuration (if mode is llm-driven) */
  llmConfig?: {
    model: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of running a persona flow
 */
export interface PersonaFlowResult {
  /** Unique run ID */
  runId: string;
  
  /** Whether run completed successfully */
  success: boolean;
  
  /** Path to video file (if recorded) */
  videoPath?: string;
  
  /** Path to trace file (if captured) */
  tracePath?: string;
  
  /** Path to events JSON file */
  eventsPath?: string;
  
  /** Path to metadata JSON file */
  metadataPath?: string;
  
  /** Number of events recorded */
  eventCount: number;
  
  /** Duration in milliseconds */
  durationMs: number;
  
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Adapter Types (for integration with existing SimulationStep)
// ============================================================================

/**
 * Adapter result when converting Playwright events to SimulationSteps
 */
export interface PlaywrightAdapterResult {
  /** Converted simulation steps */
  steps: Array<import('../types').SimulationStep>;
  
  /** Original run metadata */
  metadata: PlaywrightRunMetadata;
  
  /** Video path for playback */
  videoPath?: string;
}

