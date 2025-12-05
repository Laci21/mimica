'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine, SimulationEvent } from './engine';
import { SimulationStep, TKFInsight } from '../types';
import { TKFAggregator } from '../tkf/aggregator';

type UIVersion = 'v1' | 'v2';

interface SimulationContextValue {
  engine: SimulationEngine;
  isRunning: boolean;
  currentStep: SimulationStep | null;
  allSteps: SimulationStep[];
  tkfInsights: TKFInsight[];
  baselineSteps: SimulationStep[];
  baselineMaxSeverity: number;
  currentUIStep: number; // Current step in the onboarding flow
  currentAction: { elementId: string; action: string } | null;
  latestInsightEvent: { insightId: string; personaId: string; elementId: string } | null;
  startSimulation: (personaId: string, scenarioId: string, uiVersion: UIVersion, speed?: number) => void;
  pauseSimulation: () => void;
  resumeSimulation: (speed?: number) => void;
  stopSimulation: () => void;
  resetTKF: () => void;
  setBaseline: () => void;
  highlightedElementId: string | null;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<SimulationEngine>(new SimulationEngine());
  const tkfAggregatorRef = useRef<TKFAggregator>(new TKFAggregator());
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<SimulationStep | null>(null);
  const [allSteps, setAllSteps] = useState<SimulationStep[]>([]);
  const [tkfInsights, setTkfInsights] = useState<TKFInsight[]>([]);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [baselineSteps, setBaselineSteps] = useState<SimulationStep[]>([]);
  const [baselineMaxSeverity, setBaselineMaxSeverity] = useState<number>(0);
  const [currentUIStep, setCurrentUIStep] = useState<number>(0);
  const [currentAction, setCurrentAction] = useState<{ elementId: string; action: string } | null>(null);
  const [latestInsightEvent, setLatestInsightEvent] = useState<{ insightId: string; personaId: string; elementId: string } | null>(null);

  useEffect(() => {
    const engine = engineRef.current;
    const tkfAggregator = tkfAggregatorRef.current;

    const unsubscribe = engine.on((event: SimulationEvent) => {
      if (event.type === 'step' && event.step) {
        setCurrentStep(event.step);
        setAllSteps((prev) => [...prev, event.step!]);
        setHighlightedElementId(event.step.targetElementId);
        setIsRunning(true);

        // Update UI step based on screenId (step-0, step-1, step-2, step-3)
        const screenMatch = event.step.screenId.match(/step-(\d+)/);
        if (screenMatch) {
          const uiStep = parseInt(screenMatch[1], 10);
          console.log('📍 Setting UI step to:', uiStep, 'from screenId:', event.step.screenId);
          setCurrentUIStep(uiStep);
        }

        // Set current action for form interactions
        setCurrentAction({
          elementId: event.step.targetElementId,
          action: event.step.action
        });

        // Process step for TKF insights
        const newInsight = tkfAggregator.processStep(event.step);
        if (newInsight) {
          setTkfInsights(tkfAggregator.getInsights());
          // Emit insight event for flow animation
          setLatestInsightEvent({
            insightId: newInsight.id,
            personaId: event.step.personaId,
            elementId: event.step.targetElementId,
          });
        }
      } else if (event.type === 'complete') {
        setIsRunning(false);
        setHighlightedElementId(null);
      } else if (event.type === 'error') {
        console.error('Simulation error:', event.error);
        setIsRunning(false);
        setHighlightedElementId(null);
      }
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  const startSimulation = useCallback(
    (personaId: string, scenarioId: string, uiVersion: UIVersion, speed: number = 1) => {
      setAllSteps([]);
      setCurrentStep(null);
      setHighlightedElementId(null);
      setCurrentUIStep(0); // Reset to first step
      engineRef.current.start(personaId, scenarioId, uiVersion, speed);
    },
    []
  );

  const resetTKF = useCallback(() => {
    tkfAggregatorRef.current.clear();
    setTkfInsights([]);
  }, []);

  const pauseSimulation = useCallback(() => {
    engineRef.current.pause();
    setIsRunning(false);
  }, []);

  const resumeSimulation = useCallback((speed: number = 1) => {
    engineRef.current.resume(speed);
    setIsRunning(true);
  }, []);

  const stopSimulation = useCallback(() => {
    engineRef.current.stop();
    setIsRunning(false);
    setCurrentStep(null);
    setHighlightedElementId(null);
  }, []);

  const setBaseline = useCallback(() => {
    setBaselineSteps([...allSteps]);
    const maxSev = tkfInsights.length > 0 
      ? Math.max(...tkfInsights.map(i => i.severityScore))
      : 0;
    setBaselineMaxSeverity(maxSev);
  }, [allSteps, tkfInsights]);

  return (
    <SimulationContext.Provider
      value={{
        engine: engineRef.current,
        isRunning,
        currentStep,
        allSteps,
        tkfInsights,
        baselineSteps,
        baselineMaxSeverity,
        currentUIStep,
        currentAction,
        latestInsightEvent,
        startSimulation,
        pauseSimulation,
        resumeSimulation,
        stopSimulation,
        resetTKF,
        setBaseline,
        highlightedElementId,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
}

