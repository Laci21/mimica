/**
 * TKFTimeline Component
 * 
 * Visual timeline showing TKF updates with markers positioned by elapsed time
 */

import React from 'react';
import { TKFUpdate } from '@/lib/types/tkf';
import { getTKFUpdateElapsed } from '@/lib/replay/tkfSync';
import { formatTime } from '@/lib/replay/sync';

interface TKFTimelineProps {
  updates: TKFUpdate[];
  currentVideoTime: number;
  videoDuration: number;
  timelineDuration: number;
  currentUpdate: TKFUpdate | null;
  onUpdateClick: (update: TKFUpdate) => void;
}

export default function TKFTimeline({
  updates,
  currentVideoTime,
  videoDuration,
  timelineDuration,
  currentUpdate,
  onUpdateClick
}: TKFTimelineProps) {
  if (updates.length === 0) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <p className="text-sm text-foreground/40 text-center">No TKF updates in this run</p>
      </div>
    );
  }

  if (timelineDuration === 0) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <p className="text-sm text-foreground/40 text-center">Loading timeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Timeline Visualization */}
      <div className="bg-surface border border-border rounded-lg p-1">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-xs font-medium text-foreground/60">TKF Updates Timeline</div>
          <div className="text-xs text-foreground/40">
            {updates.length} update{updates.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Visual Timeline Bar */}
        <div className="relative h-6 px-2">
          <div className="absolute inset-x-2 inset-y-0 bg-background rounded border border-border">
            {/* Video coverage area indicator */}
            {videoDuration < timelineDuration && (
              <div
                className="absolute top-0 bottom-0 bg-surface-light/50 border-r border-border rounded-r"
                style={{
                  left: `${(videoDuration / timelineDuration) * 100}%`,
                  right: 0
                }}
                title={`Video ends at ${formatTime(videoDuration)}`}
              />
            )}

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-20"
              style={{
                left: `${Math.min(100, (currentVideoTime / timelineDuration) * 100)}%`
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full border-2 border-background"></div>
            </div>
          </div>

          {/* TKF Update Markers */}
          {updates.map((update, idx) => {
            const updateElapsed = getTKFUpdateElapsed(update);
            
            if (updateElapsed === undefined) return null;
            
            const position = Math.max(0, Math.min(100, (updateElapsed / timelineDuration) * 100));
            const isActive = currentUpdate?.id === update.id;
            const isBeyondVideo = updateElapsed > videoDuration;

            return (
              <button
                key={update.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group hover:z-30"
                style={{
                  left: `${position}%`,
                  zIndex: isActive ? 25 : 10 + idx
                }}
                onClick={() => onUpdateClick(update)}
                title={`TKF Update @ ${formatTime(updateElapsed)}\n${update.reasoning.substring(0, 80)}...${isBeyondVideo ? '\n(Video ends before this update)' : ''}`}
              >
                <div className="relative">
                  {/* Diamond/square marker for TKF updates */}
                  <div
                    className={`w-3 h-3 rotate-45 border-2 transition-all ${
                      isBeyondVideo 
                        ? 'border-yellow-500/50 bg-purple-500/70' 
                        : 'border-background bg-purple-500'
                    } ${
                      isActive ? 'scale-150 ring-2 ring-accent ring-offset-1' : 'group-hover:scale-150'
                    }`}
                  ></div>
                </div>
                
                {/* Elapsed time label on hover */}
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded px-1 py-0.5 text-xs whitespace-nowrap pointer-events-none ${
                  isBeyondVideo 
                    ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-600 dark:text-yellow-400' 
                    : 'bg-surface border border-border'
                }`}>
                  {formatTime(updateElapsed)}
                  {isBeyondVideo && ' 📹'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-0.5 px-2 text-xs text-foreground/40">
          <span>0:00</span>
          <span>{formatTime(timelineDuration)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2.5 text-xs px-0.5">
        <span className="text-foreground/50">TKF:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rotate-45 bg-purple-500 border border-background"></div>
          <span className="text-foreground/60">Knowledge Update</span>
        </div>
      </div>
    </div>
  );
}


