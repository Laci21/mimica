/**
 * TKFUpdateDetails Component
 * 
 * Displays detailed information about a TKF update during replay
 * Shows the update card + nearby events as evidence context
 */

'use client';

import { TKFUpdate } from '@/lib/types/tkf';
import { PlaywrightEvent } from '@/lib/api/playwright';
import { getTKFUpdateElapsed } from '@/lib/replay/tkfSync';
import { getEventElapsed } from '@/lib/replay/tkfSync';
import { formatTime, getEventStatusColor } from '@/lib/replay/sync';
import { useEffect, useState } from 'react';

interface TKFUpdateDetailsProps {
  update: TKFUpdate | null;
  nearbyEvents?: PlaywrightEvent[];
  videoTime: number;
  onEventClick?: (event: PlaywrightEvent) => void;
}

export default function TKFUpdateDetails({ 
  update, 
  nearbyEvents = [],
  videoTime,
  onEventClick 
}: TKFUpdateDetailsProps) {
  const [key, setKey] = useState(0);
  const [showFlowDot, setShowFlowDot] = useState(false);

  // Trigger animation when update changes
  useEffect(() => {
    if (update) {
      setKey(prev => prev + 1);
      
      // Check if any nearby events are confused or blocked
      const hasIssue = nearbyEvents.some(
        e => e.status === 'confused' || e.status === 'blocked'
      );
      
      if (hasIssue) {
        setShowFlowDot(true);
        setTimeout(() => setShowFlowDot(false), 1400); // Match animation duration
      }
    }
  }, [update?.id, nearbyEvents]);

  if (!update) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-foreground/40">
          <div className="text-4xl mb-3">🧵</div>
          <p className="text-sm">No TKF update at current time</p>
          <p className="text-xs mt-2">Video time: {formatTime(videoTime)}</p>
        </div>
      </div>
    );
  }

  const updateElapsed = getTKFUpdateElapsed(update);

  return (
    <div className="p-6 space-y-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between relative">
        <div>
          <h3 className="text-lg font-semibold text-accent mb-1">
            Knowledge Update
          </h3>
          <p className="text-xs text-foreground/50">
            Persona: {update.metadata.persona_id || 'Unknown'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground/40">Time</div>
          <div className="text-sm font-mono text-foreground/70">
            {updateElapsed !== undefined ? formatTime(updateElapsed) : 'N/A'}
          </div>
        </div>
        
        {/* Flow dot animation for confused/blocked events */}
        {showFlowDot && (
          <div 
            className="absolute -top-2 left-1/2 w-2 h-2 bg-yellow-500 rounded-full animate-flow-dot"
            style={{ transform: 'translate(-50%, 0)' }}
          />
        )}
      </div>

      {/* TKF Update Card - with animation */}
      <div 
        key={key}
        className="bg-surface border border-border rounded-lg p-4 animate-insight-pop"
      >
        {/* Reasoning */}
        <div className="mb-3">
          <div className="text-xs font-medium text-foreground/60 mb-2">
            💡 Insight Reasoning
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {update.reasoning}
          </p>
        </div>

        {/* Text Changes */}
        {update.new_text && (
          <div className="space-y-2">
            {update.old_text && (
              <div className="rounded bg-red-500/5 border border-red-500/20 p-2">
                <div className="text-[10px] uppercase text-red-400/80 mb-1">− Replaced</div>
                <pre className="text-xs text-red-300/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {update.old_text}
                </pre>
              </div>
            )}

            <div className="rounded bg-green-500/5 border border-green-500/20 p-2">
              <div className="text-[10px] uppercase text-green-400/80 mb-1">+ Added</div>
              <pre className="text-xs text-green-300/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {update.new_text}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Context: Nearby Events */}
      {nearbyEvents.length > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="text-xs font-medium text-foreground/60 mb-3">
            📋 Evidence Context ({nearbyEvents.length} nearby event{nearbyEvents.length !== 1 ? 's' : ''})
          </div>
          
          <div className="space-y-2">
            {nearbyEvents.map((event, idx) => {
              const eventElapsed = getEventElapsed(event);
              const statusColors = getEventStatusColor(event.status);
              
              return (
                <button
                  key={idx}
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left p-3 rounded-lg border border-border bg-surface/50 hover:bg-surface-light hover:border-accent/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground/50">
                        {eventElapsed !== undefined ? formatTime(eventElapsed) : 'N/A'}
                      </span>
                      <span className="text-xs font-medium text-accent">
                        {event.action}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs border ${statusColors}`}>
                      {event.status}
                    </span>
                  </div>
                  
                  {event.reasoning_text && (
                    <p className="text-xs text-foreground/70 line-clamp-2 italic">
                      "{event.reasoning_text}"
                    </p>
                  )}
                  
                  {event.target_element_id && (
                    <p className="text-xs text-foreground/40 mt-1 font-mono">
                      → {event.target_element_id}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata Footer */}
      <div className="pt-4 border-t border-border">
        <div className="text-xs font-medium text-foreground/60 mb-2">
          Metadata
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(update.metadata).map(([key, value]) => (
            <span
              key={key}
              className="text-xs px-2 py-1 rounded bg-accent/10 text-accent/90 border border-accent/20"
            >
              {key}: {String(value)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

