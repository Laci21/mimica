/**
 * EventTimeline Component
 * 
 * Visual timeline showing all events with color-coded markers
 */

import React from 'react';
import { PlaywrightEvent } from '@/lib/api/playwright';
import { getVideoTimeForEvent, getEventMarkerColor, formatTime } from '@/lib/replay/sync';

interface EventTimelineProps {
  events: PlaywrightEvent[];
  currentVideoTime: number;
  videoDuration: number;
  timelineDuration: number; // Actual duration for event positioning (may be longer than video)
  startUnix: number;
  currentEvent: PlaywrightEvent | null;
  onEventClick: (event: PlaywrightEvent) => void;
}

interface EventGroup {
  events: PlaywrightEvent[];
  position: number;
  eventVideoTime: number;
}

export default function EventTimeline({
  events,
  currentVideoTime,
  videoDuration,
  timelineDuration,
  startUnix,
  currentEvent,
  onEventClick
}: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <p className="text-sm text-foreground/40 text-center">No events in this run</p>
      </div>
    );
  }

  if (timelineDuration === 0 || startUnix === 0) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <p className="text-sm text-foreground/40 text-center">Loading timeline...</p>
      </div>
    );
  }

  // Group overlapping events (within 1% of timeline width)
  const eventGroups: EventGroup[] = [];
  const OVERLAP_THRESHOLD = 1.0; // 1% of timeline width
  
  events.forEach((event) => {
    const eventVideoTime = getVideoTimeForEvent(event, startUnix);
    const position = (eventVideoTime / timelineDuration) * 100;
    
    // Find if there's an existing group within threshold
    const existingGroup = eventGroups.find(
      group => Math.abs(group.position - position) < OVERLAP_THRESHOLD
    );
    
    if (existingGroup) {
      existingGroup.events.push(event);
    } else {
      eventGroups.push({
        events: [event],
        position,
        eventVideoTime
      });
    }
  });

  // State to track which event in a group is currently selected
  const [groupIndices, setGroupIndices] = React.useState<Map<number, number>>(new Map());

  const handleGroupClick = (group: EventGroup, groupIdx: number) => {
    if (group.events.length === 1) {
      // Single event, just click it
      onEventClick(group.events[0]);
    } else {
      // Multiple events, cycle through them
      const currentIndex = groupIndices.get(groupIdx) || 0;
      const nextIndex = (currentIndex + 1) % group.events.length;
      setGroupIndices(new Map(groupIndices).set(groupIdx, nextIndex));
      onEventClick(group.events[nextIndex]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Timeline Visualization */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-foreground/60">Event Timeline</div>
          <div className="text-xs text-foreground/40">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Visual Timeline Bar - with padding to ensure edge markers are visible */}
        <div className="relative h-12 px-2">
          <div className="absolute inset-x-2 inset-y-0 bg-background rounded border border-border">
            {/* Video coverage area - show where video ends if it's shorter than timeline */}
            {videoDuration < timelineDuration && (
              <div
                className="absolute top-0 bottom-0 bg-surface-light/50 border-r border-border rounded-r"
                style={{
                  left: `${(videoDuration / timelineDuration) * 100}%`,
                  right: 0
                }}
                title={`Video ends at ${formatTime(videoDuration)} (no video for remaining events)`}
              />
            )}

            {/* Current time indicator - positioned based on timeline duration */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-20"
              style={{
                left: `${Math.min(100, (currentVideoTime / timelineDuration) * 100)}%`
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full border-2 border-background"></div>
            </div>
          </div>

          {/* Event marker groups */}
          {eventGroups.map((group, groupIdx) => {
            const clampedPosition = Math.max(0, Math.min(100, group.position));
            
            // Determine which event in the group to display
            const selectedIndex = groupIndices.get(groupIdx) || 0;
            const displayEvent = group.events[selectedIndex];
            
            // Check if any event in this group is currently active
            const hasActiveEvent = group.events.some(e => e.step_index === currentEvent?.step_index);
            const isActive = hasActiveEvent || Math.abs(group.eventVideoTime - currentVideoTime) < 0.5;
            const isBeyondVideo = group.eventVideoTime > videoDuration;
            const markerColor = getEventMarkerColor(displayEvent.status);
            const hasMultiple = group.events.length > 1;

            return (
              <button
                key={groupIdx}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group hover:z-30"
                style={{
                  left: `${clampedPosition}%`,
                  zIndex: isActive ? 25 : 10 + groupIdx
                }}
                onClick={() => handleGroupClick(group, groupIdx)}
                title={hasMultiple 
                  ? `${group.events.length} events (click to cycle)\nShowing: Step ${displayEvent.step_index + 1} - ${displayEvent.action}${isBeyondVideo ? '\n(Video ends before these events)' : ''}`
                  : `Step ${displayEvent.step_index + 1} @ ${formatTime(group.eventVideoTime)}\n${displayEvent.action}: ${displayEvent.reasoning_text?.substring(0, 80)}...${isBeyondVideo ? '\n(Video ends before this event)' : ''}`
                }
                data-step={displayEvent.step_index}
                data-position={clampedPosition.toFixed(2)}
                data-group-size={group.events.length}
              >
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      isBeyondVideo 
                        ? 'border-yellow-500/50' 
                        : 'border-background'
                    } ${
                      isActive ? 'scale-150 ring-2 ring-accent ring-offset-1' : 'group-hover:scale-150'
                    }`}
                    style={{ backgroundColor: markerColor }}
                  ></div>
                  
                  {/* Badge for multiple events */}
                  {hasMultiple && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent text-white text-xs flex items-center justify-center rounded-full border border-background font-bold">
                      {group.events.length}
                    </div>
                  )}
                </div>
                
                {/* Step number label on hover */}
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded px-1 py-0.5 text-xs whitespace-nowrap pointer-events-none ${
                  isBeyondVideo 
                    ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-600 dark:text-yellow-400' 
                    : 'bg-surface border border-border'
                }`}>
                  {displayEvent.step_index + 1}
                  {isBeyondVideo && ' 📹'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-2 px-2 text-xs text-foreground/40">
          <span>0:00</span>
          <span>{formatTime(timelineDuration)}</span>
        </div>
      </div>

      {/* Legend and Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-xs px-2">
          <span className="text-foreground/50">Status:</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="text-foreground/60">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
            <span className="text-foreground/60">Confused</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-foreground/60">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-foreground/60">Delighted</span>
          </div>
        </div>

        {/* Warning when video is shorter than timeline */}
        {videoDuration < timelineDuration && (
          <div className="px-2 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-600 dark:text-yellow-400">
            ⚠️ Video ends at {formatTime(videoDuration)} • Some events occurred after recording stopped
          </div>
        )}
      </div>
    </div>
  );
}

