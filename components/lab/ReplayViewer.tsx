'use client';

import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import EventTimeline from './EventTimeline';
import TKFTimeline from './TKFTimeline';
import EventDetails from './EventDetails';
import TKFUpdateDetails from './TKFUpdateDetails';
import {
  getPlaywrightRunEvents,
  getPlaywrightRunVideoUrl,
  getPlaywrightRunMetadata,
  type RunListItem,
  type PlaywrightEvent,
  type RunMetadata,
} from '@/lib/api/playwright';
import { fetchTKFUpdates } from '@/lib/api/tkf';
import { TKFUpdate } from '@/lib/types/tkf';
import { getStartUnixTime, findCurrentEvent, getVideoTimeForEvent } from '@/lib/replay/sync';
import { 
  findCurrentTKFUpdate, 
  findNearestEvents, 
  sortTKFUpdatesByElapsed,
  getTKFUpdateElapsed 
} from '@/lib/replay/tkfSync';

interface ReplayViewerProps {
  selectedRunId: string;
  onRunChange: (runId: string) => void;
  runs: RunListItem[];
}

export default function ReplayViewer({ selectedRunId, onRunChange, runs }: ReplayViewerProps) {
  const [events, setEvents] = useState<PlaywrightEvent[]>([]);
  const [metadata, setMetadata] = useState<RunMetadata | null>(null);
  const [currentEvent, setCurrentEvent] = useState<PlaywrightEvent | null>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [actualDuration, setActualDuration] = useState(0);
  const [startUnix, setStartUnix] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // TKF integration
  const [rightPanelMode, setRightPanelMode] = useState<'events' | 'tkf'>('events');
  const [tkfUpdates, setTkfUpdates] = useState<TKFUpdate[]>([]);
  const [currentTKFUpdate, setCurrentTKFUpdate] = useState<TKFUpdate | null>(null);
  const [nearbyEvents, setNearbyEvents] = useState<PlaywrightEvent[]>([]);

  // Load selected run data
  useEffect(() => {
    if (!selectedRunId) return;

    const loadRunData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [runMetadata, runEvents, tkfData] = await Promise.all([
          getPlaywrightRunMetadata(selectedRunId),
          getPlaywrightRunEvents(selectedRunId),
          fetchTKFUpdates({ session_id: selectedRunId }),
        ]);
        
        setMetadata(runMetadata);
        setEvents(runEvents);
        
        // Sort TKF updates by elapsed time
        const sortedTKF = sortTKFUpdatesByElapsed(tkfData);
        setTkfUpdates(sortedTKF);
        
        // Calculate start Unix time for synchronization
        const startTime = getStartUnixTime(runMetadata.started_at);
        setStartUnix(startTime);
        
        // Use metadata duration (actual run duration) for timeline
        const runDuration = runMetadata.duration_ms ? runMetadata.duration_ms / 1000 : 0;
        setActualDuration(runDuration);
        
        // Reset playback state
        setVideoTime(0);
        setCurrentEvent(null);
        setCurrentTKFUpdate(null);
        setNearbyEvents([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run data');
      } finally {
        setIsLoading(false);
      }
    };

    loadRunData();
  }, [selectedRunId]);

  // Calculate smart timeline duration that fits both video and events
  const timelineDuration = React.useMemo(() => {
    // Find the maximum elapsed time from events
    const maxEventElapsed = events.length > 0 
      ? Math.max(...events.filter(e => e.elapsed !== undefined).map(e => e.elapsed!), 0)
      : 0;
    
    // Use the maximum of video duration, max event elapsed, and metadata duration
    // This ensures timeline is long enough for all content
    const duration = Math.max(
      videoDuration > 0 ? videoDuration : 0,
      maxEventElapsed,
      actualDuration > 0 ? actualDuration : 0
    );
    
    return duration > 0 ? duration : videoDuration;
  }, [events, videoDuration, actualDuration]);

  // Update current event based on video time
  useEffect(() => {
    if (events.length > 0 && startUnix > 0) {
      const event = findCurrentEvent(events, videoTime, startUnix);
      setCurrentEvent(event);
    }
  }, [videoTime, events, startUnix]);

  // Update current TKF update based on video time and current event
  useEffect(() => {
    if (tkfUpdates.length > 0) {
      const update = findCurrentTKFUpdate(tkfUpdates, videoTime, currentEvent);
      setCurrentTKFUpdate(update);
      
      // Find nearby events for evidence context
      if (update && events.length > 0) {
        const nearby = findNearestEvents(update, events, 3);
        setNearbyEvents(nearby);
      } else {
        setNearbyEvents([]);
      }
    }
  }, [videoTime, currentEvent, tkfUpdates, events]);

  const handleEventClick = (event: PlaywrightEvent) => {
    // Calculate video time for this event and seek to it
    const eventVideoTime = getVideoTimeForEvent(event, startUnix);
    
    // If event is beyond video duration, seek to the last frame instead
    const clampedTime = videoDuration > 0 ? Math.min(eventVideoTime, videoDuration - 0.1) : eventVideoTime;
    
    setSeekToTime(clampedTime);
    
    // For events beyond video, explicitly set as current event since video won't reach that time
    if (eventVideoTime > videoDuration) {
      setCurrentEvent(event);
    }
  };

  const handleTKFUpdateClick = (update: TKFUpdate) => {
    // Seek video to the update's elapsed time
    const updateElapsed = getTKFUpdateElapsed(update);
    
    if (updateElapsed !== undefined) {
      const clampedTime = videoDuration > 0 ? Math.min(updateElapsed, videoDuration - 0.1) : updateElapsed;
      setSeekToTime(clampedTime);
    }
  };

  const videoUrl = selectedRunId ? getPlaywrightRunVideoUrl(selectedRunId) : '';

  if (runs.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold mb-2 text-accent">
            No Replays Available
          </h3>
          <p className="text-foreground/60 text-sm">
            Run simulations from the Run page to generate replays
          </p>
          <a
            href="/run"
            className="inline-block mt-4 px-4 py-2 bg-accent hover:bg-accent-light rounded-lg text-sm font-medium transition-colors"
          >
            Go to Run Page
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-foreground/40">Loading replay...</p>
          </div>
        </div>
      ) : metadata && videoUrl ? (
        <>
          {/* Video Player + Timeline - Left (65%) - SCROLLABLE */}
          <div className="w-[65%] flex flex-col min-h-0 overflow-y-auto">
            <div className="flex items-baseline justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-foreground/90">
                Video Recording
              </h3>
              <div className="text-xs text-foreground/50">
                {metadata.persona_id} • {metadata.duration_ms ? `${(metadata.duration_ms / 1000).toFixed(1)}s` : 'N/A'} • {events.length} events
              </div>
            </div>
            
            {error && (
              <div className="mb-1 p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex-shrink-0">
                {error}
              </div>
            )}
            
            {/* Video Player */}
            <div className="flex-shrink-0 mb-0.5">
              <VideoPlayer
                videoUrl={videoUrl}
                onTimeUpdate={setVideoTime}
                onDurationChange={setVideoDuration}
                seekToTime={seekToTime}
                variant="compact"
              />
            </div>
            
            {/* Event Timeline below video */}
            <div className="flex-shrink-0">
              <EventTimeline
                events={events}
                currentVideoTime={videoTime}
                videoDuration={videoDuration}
                timelineDuration={timelineDuration}
                startUnix={startUnix}
                currentEvent={currentEvent}
                onEventClick={handleEventClick}
              />
            </div>

            {/* TKF Timeline below event timeline */}
            {tkfUpdates.length > 0 && (
              <div className="flex-shrink-0 mt-2">
                <TKFTimeline
                  updates={tkfUpdates}
                  currentVideoTime={videoTime}
                  videoDuration={videoDuration}
                  timelineDuration={timelineDuration}
                  currentUpdate={currentTKFUpdate}
                  onUpdateClick={handleTKFUpdateClick}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Event Details or TKF (35%) */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Panel Mode Toggle */}
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <button
                onClick={() => setRightPanelMode('events')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  rightPanelMode === 'events'
                    ? 'bg-accent text-white'
                    : 'bg-surface hover:bg-surface-light border border-border'
                }`}
              >
                📋 Events
              </button>
              <button
                onClick={() => setRightPanelMode('tkf')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  rightPanelMode === 'tkf'
                    ? 'bg-accent text-white'
                    : 'bg-surface hover:bg-surface-light border border-border'
                }`}
              >
                🧵 TKF {tkfUpdates.length > 0 && `(${tkfUpdates.length})`}
              </button>
            </div>

            <div className="flex-1 bg-surface/50 rounded-lg border border-border overflow-y-auto min-h-0">
              {rightPanelMode === 'events' ? (
                <EventDetails
                  event={currentEvent}
                  personaName={metadata.persona_id}
                  videoTime={videoTime}
                />
              ) : (
                <TKFUpdateDetails
                  update={currentTKFUpdate}
                  nearbyEvents={nearbyEvents}
                  videoTime={videoTime}
                  onEventClick={handleEventClick}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

