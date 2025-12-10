/**
 * EventList Component
 * 
 * Scrollable list of all events with click-to-seek functionality
 */

import { PlaywrightEvent } from '@/lib/api/playwright';
import { getVideoTimeForEvent, getEventStatusColor, formatTime } from '@/lib/replay/sync';

interface EventListProps {
  events: PlaywrightEvent[];
  currentEvent: PlaywrightEvent | null;
  startUnix: number;
  videoDuration?: number;
  onEventClick: (event: PlaywrightEvent) => void;
}

export default function EventList({ 
  events, 
  currentEvent, 
  startUnix,
  videoDuration,
  onEventClick 
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-foreground/40">
        <p className="text-sm">No events recorded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="text-xs font-medium text-foreground/60 p-4 pb-2 flex-shrink-0">
        All Events ({events.length})
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
        {events.map((event, idx) => {
          const videoTime = getVideoTimeForEvent(event, startUnix);
          const statusColors = getEventStatusColor(event.status);
          const isActive = currentEvent?.step_index === event.step_index;
          const isBeyondVideo = videoDuration && videoTime > videoDuration;

          return (
            <button
              key={idx}
              onClick={() => onEventClick(event)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isActive
                  ? 'bg-accent/10 border-accent shadow-sm'
                  : isBeyondVideo
                  ? 'bg-surface border-yellow-500/30 hover:bg-yellow-500/5'
                  : 'bg-surface border-border hover:bg-surface-light hover:border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground/50">
                    {formatTime(videoTime)}
                  </span>
                  {isBeyondVideo && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400" title="Occurred after video ended">
                      📹
                    </span>
                  )}
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
    </div>
  );
}

