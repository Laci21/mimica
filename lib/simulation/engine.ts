import { SimulationStep, SimulationRun, UIVersion } from '../types';
import { getSimulationSequence } from '../data/simulation-sequences';

export type SimulationEventType = 'step' | 'complete' | 'error';

export interface SimulationEvent {
  type: SimulationEventType;
  step?: SimulationStep;
  run?: SimulationRun;
  error?: string;
}

export type SimulationEventHandler = (event: SimulationEvent) => void;

export class SimulationEngine {
  private currentRun: SimulationRun | null = null;
  private eventHandlers: SimulationEventHandler[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;
  private currentStepIndex: number = 0;

  constructor() {}

  public on(handler: SimulationEventHandler) {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  private emit(event: SimulationEvent) {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  public async start(
    personaId: string,
    scenarioId: string,
    uiVersion: UIVersion,
    speed: number = 1
  ): Promise<void> {
    // Stop any existing simulation
    this.stop();

    // Get the sequence for this persona and version
    const steps = getSimulationSequence(personaId, uiVersion);
    
    if (steps.length === 0) {
      this.emit({
        type: 'error',
        error: `No simulation sequence found for ${personaId} on ${uiVersion}`,
      });
      return;
    }

    // Create a new run
    this.currentRun = {
      id: `run-${Date.now()}`,
      personaId,
      scenarioId,
      uiVersion,
      steps,
      startedAt: Date.now(),
      status: 'running',
    };

    this.currentStepIndex = 0;
    this.isPaused = false;

    // Start executing steps
    this.executeNextStep(speed);
  }

  private executeNextStep(speed: number) {
    if (!this.currentRun || this.isPaused) return;

    if (this.currentStepIndex >= this.currentRun.steps.length) {
      // Simulation complete
      this.currentRun.status = 'completed';
      this.currentRun.completedAt = Date.now();
      this.emit({
        type: 'complete',
        run: this.currentRun,
      });
      this.currentRun = null;
      return;
    }

    const step = this.currentRun.steps[this.currentStepIndex];
    
    // Emit the step event
    this.emit({
      type: 'step',
      step,
    });

    // Calculate delay (base duration / speed)
    const delay = (step.durationMs || 1000) / speed;

    // Schedule next step
    this.timeoutId = setTimeout(() => {
      this.currentStepIndex++;
      this.executeNextStep(speed);
    }, delay);
  }

  public pause() {
    this.isPaused = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  public resume(speed: number = 1) {
    if (this.currentRun && this.isPaused) {
      this.isPaused = false;
      this.executeNextStep(speed);
    }
  }

  public stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.currentRun) {
      this.currentRun.status = 'failed';
      this.currentRun = null;
    }
    this.currentStepIndex = 0;
    this.isPaused = false;
  }

  public isRunning(): boolean {
    return this.currentRun !== null && this.currentRun.status === 'running';
  }

  public getCurrentRun(): SimulationRun | null {
    return this.currentRun;
  }
}

