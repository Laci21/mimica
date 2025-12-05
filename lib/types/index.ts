// Core data model types for Mimica

export interface Persona {
  id: string;
  name: string;
  avatarColor: string;
  description: string;
  goals: string[];
  preferences: string[];
  painPoints: string[];
  tone: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  targetOutcome: string;
}

export interface UIElement {
  id: string;
  screenId: string;
  label: string;
  semanticRole: 'primary-cta' | 'secondary-cta' | 'input' | 'toggle' | 'helper-text' | 'navigation' | 'choice';
  selector?: string; // For future Playwright integration
}

export type SimulationAction = 'CLICK' | 'TYPE' | 'NAVIGATE' | 'HOVER' | 'WAIT';
export type SimulationStatus = 'success' | 'confused' | 'blocked' | 'delighted';

export interface SimulationStep {
  stepIndex: number;
  personaId: string;
  screenId: string;
  action: SimulationAction;
  targetElementId: string;
  inputValue?: string;
  reasoningText: string;
  status: SimulationStatus;
  durationMs?: number;
}

export type InsightType = 'confusion' | 'friction' | 'delight' | 'opportunity';
export type InsightTag = 
  | 'copy-clarity' 
  | 'navigation' 
  | 'visual-hierarchy' 
  | 'interaction-design'
  | 'information-overload'
  | 'missing-guidance'
  | 'positive-experience';

export interface TKFInsight {
  id: string;
  type: InsightType;
  personaIds: string[];
  elementIds: string[];
  tags: InsightTag[];
  summary: string;
  evidence: number[]; // SimulationStep indices
  severityScore: number; // 1-10
  createdAt: number;
  resolved?: boolean; // Marked as resolved after improvements
  previousSeverity?: number; // Previous severity score for comparison
}

export interface SimulationRun {
  id: string;
  personaId: string;
  scenarioId: string;
  uiVersion: 'v1' | 'v2';
  steps: SimulationStep[];
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed';
}

