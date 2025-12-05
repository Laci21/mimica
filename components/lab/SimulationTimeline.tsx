'use client';

import { SimulationStep } from '@/lib/types';
import { getPersonaById } from '@/lib/data/personas';
import { useEffect, useRef } from 'react';

interface SimulationTimelineProps {
  steps: SimulationStep[];
  currentStep: SimulationStep | null;
}

export default function SimulationTimeline({ steps, currentStep }: SimulationTimelineProps) {
  const currentStepRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step
  useEffect(() => {
    if (currentStepRef.current && currentStep) {
      currentStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentStep]);
  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-foreground/40">
        No simulation running. Select a persona and click &quot;Run Simulation&quot;.
      </div>
    );
  }

  const persona = steps[0] ? getPersonaById(steps[0].personaId) : null;

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isCurrent = currentStep?.stepIndex === step.stepIndex;
        const statusColor = {
          success: 'text-success',
          confused: 'text-warning',
          blocked: 'text-error',
          delighted: 'text-accent-light',
        }[step.status];

        const statusBg = {
          success: 'bg-success/10',
          confused: 'bg-warning/10',
          blocked: 'bg-error/10',
          delighted: 'bg-accent/10',
        }[step.status];

        return (
          <div
            key={index}
            ref={isCurrent ? currentStepRef : null}
            className={`p-4 rounded-lg border transition-all ${
              isCurrent
                ? 'border-accent bg-accent/5 scale-105'
                : 'border-border bg-surface'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusBg}`}
                style={{ backgroundColor: persona?.avatarColor }}
              >
                <span className="text-white font-bold text-sm">
                  {persona?.name.charAt(0)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{persona?.name}</span>
                  <span className="text-xs text-foreground/40">
                    Step {step.stepIndex + 1}
                  </span>
                  <span className={`text-xs font-medium ${statusColor}`}>
                    {step.action}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 italic">
                  &quot;{step.reasoningText}&quot;
                </p>
                <div className="text-xs text-foreground/40 mt-1">
                  Target: <span className="font-mono">{step.targetElementId}</span>
                </div>
              </div>

              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full ${statusBg} flex-shrink-0 mt-2`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

