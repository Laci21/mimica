'use client';

import { useEffect, useState } from 'react';
import { getPersonaById } from '@/lib/data/personas';

interface InsightStreamProps {
  event: { insightId: string; personaId: string; elementId: string } | null;
  thoughtBubbleRef?: HTMLDivElement | null;
}

interface Particle {
  id: string;
  personaId: string;
  color: string;
  startX: number;
  startY: number;
}

export default function InsightStream({ event, thoughtBubbleRef }: InsightStreamProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!event) return;

    const persona = getPersonaById(event.personaId);
    const color = persona?.avatarColor || '#8b5cf6';

    // Try to find the thought bubble's position
    let startX = 0;
    let startY = 100;

    // Find the highlighted element or thought bubble in the left panel
    const targetElement = document.querySelector(`[data-element-id="${event.elementId}"]`);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      // Get position relative to viewport, offset to start near the element
      startX = rect.left + rect.width / 2;
      startY = rect.top - 30; // Start slightly above the element
    } else {
      // Fallback to a safe position if element not found
      startX = window.innerWidth * 0.25;
      startY = window.innerHeight * 0.4;
    }

    // Add new particle
    const particle: Particle = {
      id: event.insightId + Date.now(),
      personaId: event.personaId,
      color,
      startX,
      startY,
    };

    setParticles((prev) => [...prev, particle]);

    // Remove particle after animation completes
    const timeout = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== particle.id));
    }, 1600);

    return () => clearTimeout(timeout);
  }, [event, thoughtBubbleRef]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {particles.map((particle) => {
        return (
          <div
            key={particle.id}
            className="absolute animate-flow-dot"
            style={{
              top: `${particle.startY}px`,
              left: `${particle.startX}px`,
            }}
          >
            {/* Knowledge thread/note icon */}
            <div className="relative">
              {/* Main icon - small note/thread */}
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold shadow-lg"
                style={{
                  backgroundColor: particle.color,
                  boxShadow: `0 2px 12px ${particle.color}88, 0 0 20px ${particle.color}44`,
                }}
              >
                🧵
              </div>
              
              {/* Subtle glow */}
              <div
                className="absolute inset-0 rounded blur-md opacity-40"
                style={{
                  backgroundColor: particle.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

