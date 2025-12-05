'use client';

import { useEffect, useState } from 'react';
import { SimulationStep } from '@/lib/types';
import { getPersonaById } from '@/lib/data/personas';

interface ThoughtBubbleProps {
  step: SimulationStep;
  targetElementId: string;
}

export default function ThoughtBubble({ step, targetElementId }: ThoughtBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const persona = getPersonaById(step.personaId);

  useEffect(() => {
    // Find the target element in the DOM
    const element = document.querySelector(`[data-element-id="${targetElementId}"]`);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      const previewContainer = element.closest('.min-h-full');
      const containerRect = previewContainer?.getBoundingClientRect();
      
      if (containerRect) {
        // Position bubble above and slightly to the right of the element
        setPosition({
          top: rect.top - containerRect.top - 20,
          left: rect.left - containerRect.left + rect.width / 2,
        });
      }
    }

    // Fade in
    setIsVisible(true);

    // Optional: fade out after a while if not the current step
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [targetElementId, step]);

  const statusEmoji = {
    success: '✅',
    confused: '🤔',
    blocked: '🚫',
    delighted: '😊',
  }[step.status];

  const statusColor = {
    success: 'border-success bg-success/10',
    confused: 'border-warning bg-warning/10',
    blocked: 'border-error bg-error/10',
    delighted: 'border-accent bg-accent/10',
  }[step.status];

  return (
    <div
      className={`absolute z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      {/* Thought bubble */}
      <div
        className={`relative max-w-xs px-4 py-3 rounded-2xl border-2 ${statusColor} backdrop-blur-sm shadow-xl`}
      >
        {/* Avatar badge */}
        <div
          className="absolute -top-3 -left-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg"
          style={{ backgroundColor: persona?.avatarColor }}
        >
          <span className="text-white">{persona?.name.charAt(0)}</span>
        </div>

        {/* Thought content */}
        <div className="flex items-start gap-2">
          <span className="text-xl flex-shrink-0">{statusEmoji}</span>
          <div className="flex-1">
            <p className="text-sm font-medium italic text-foreground/90">
              &quot;{step.reasoningText}&quot;
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-foreground/50 font-medium uppercase">
                {step.action}
              </span>
            </div>
          </div>
        </div>

        {/* Pointer tail */}
        <div
          className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45 border-r-2 border-b-2 ${statusColor}`}
        />
      </div>
    </div>
  );
}

