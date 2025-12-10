/**
 * EventDetails Component
 * 
 * Displays detailed information about the current event during video replay
 */

import { PlaywrightEvent } from '@/lib/api/playwright';
import { getEventStatusColor, formatTime } from '@/lib/replay/sync';

interface EventDetailsProps {
  event: PlaywrightEvent | null;
  personaName?: string;
  videoTime: number;
}

export default function EventDetails({ event, personaName, videoTime }: EventDetailsProps) {
  if (!event) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-foreground/40">
          <div className="text-4xl mb-3">⏸️</div>
          <p className="text-sm">No event at current time</p>
          <p className="text-xs mt-2">Video time: {formatTime(videoTime)}</p>
        </div>
      </div>
    );
  }

  const statusColors = getEventStatusColor(event.status);

  return (
    <div className="p-6 space-y-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-accent">
              Step {event.step_index + 1}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors}`}>
              {event.status}
            </span>
          </div>
          {personaName && (
            <p className="text-xs text-foreground/50">{personaName}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground/40">Time</div>
          <div className="text-sm font-mono text-foreground/70">
            {formatTime(videoTime)}
          </div>
        </div>
      </div>

      {/* Action Badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-accent/20 rounded-full text-sm font-medium text-accent">
          {event.action}
        </span>
        {event.target_element_id && (
          <span className="text-xs text-foreground/50 font-mono">
            → {event.target_element_id}
          </span>
        )}
      </div>

      {/* Reasoning Text - The Star! */}
      {event.reasoning_text && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-foreground/60 mb-2">
            💭 Persona Thought
          </div>
          <p className="text-sm text-foreground leading-relaxed italic">
            "{event.reasoning_text}"
          </p>
        </div>
      )}

      {/* Technical Details */}
      <div className="space-y-2 pt-4 border-t border-border">
        <div className="text-xs font-medium text-foreground/60 mb-2">
          Technical Details
        </div>
        
        {event.target_selector && (
          <div>
            <div className="text-xs text-foreground/40">Selector</div>
            <div className="text-xs font-mono text-foreground/70 bg-surface px-2 py-1 rounded mt-1 break-all">
              {event.target_selector}
            </div>
          </div>
        )}

        {event.screen_id && (
          <div>
            <div className="text-xs text-foreground/40">Screen ID</div>
            <div className="text-xs text-foreground/70">{event.screen_id}</div>
          </div>
        )}

        {event.duration_ms !== null && event.duration_ms !== undefined && (
          <div>
            <div className="text-xs text-foreground/40">Duration</div>
            <div className="text-xs text-foreground/70">{event.duration_ms}ms</div>
          </div>
        )}
      </div>
    </div>
  );
}

