'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import EventTimeline from './EventTimeline';
import EventDetails from './EventDetails';
import {
  getPlaywrightRunEvents,
  getPlaywrightRunVideoUrl,
  getPlaywrightRunMetadata,
  type RunListItem,
  type PlaywrightEvent,
  type RunMetadata,
} from '@/lib/api/playwright';
import { getStartUnixTime, findCurrentEvent, getVideoTimeForEvent } from '@/lib/replay/sync';

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

  // Load selected run data
  useEffect(() => {
    if (!selectedRunId) return;

    const loadRunData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [runMetadata, runEvents] = await Promise.all([
          getPlaywrightRunMetadata(selectedRunId),
          getPlaywrightRunEvents(selectedRunId),
        ]);
        
        setMetadata(runMetadata);
        setEvents(runEvents);
        
        // Calculate start Unix time for synchronization
        const startTime = getStartUnixTime(runMetadata.started_at);
        setStartUnix(startTime);
        
        // Use metadata duration (actual run duration) for timeline
        const runDuration = runMetadata.duration_ms ? runMetadata.duration_ms / 1000 : 0;
        setActualDuration(runDuration);
        
        // Reset playback state
        setVideoTime(0);
        setCurrentEvent(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run data');
      } finally {
        setIsLoading(false);
      }
    };

    loadRunData();
  }, [selectedRunId]);

  // Update current event based on video time
  useEffect(() => {
    if (events.length > 0 && startUnix > 0) {
      const event = findCurrentEvent(events, videoTime, startUnix);
      setCurrentEvent(event);
    }
  }, [videoTime, events, startUnix]);

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
    <div className="h-full flex gap-6 overflow-hidden">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-foreground/40">Loading replay...</p>
          </div>
        </div>
      ) : metadata && videoUrl ? (
        <>
          {/* Video Player + Timeline - Left (60%) - SCROLLABLE */}
          <div className="w-[60%] flex flex-col min-h-0 overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground/90 mb-3 flex-shrink-0">
              Video Recording
            </h3>
            
            {error && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex-shrink-0">
                {error}
              </div>
            )}
            
            {/* Video Player */}
            <div className="flex-shrink-0 max-w-3xl mb-4">
              <VideoPlayer
                videoUrl={videoUrl}
                onTimeUpdate={setVideoTime}
                onDurationChange={setVideoDuration}
                seekToTime={seekToTime}
              />
            </div>
            
            {/* Event Timeline below video */}
            <div className="flex-shrink-0 max-w-3xl mb-4">
              <EventTimeline
                events={events}
                currentVideoTime={videoTime}
                videoDuration={videoDuration}
                timelineDuration={actualDuration > 0 ? actualDuration : videoDuration}
                startUnix={startUnix}
                currentEvent={currentEvent}
                onEventClick={handleEventClick}
              />
            </div>

            {/* Metadata Info */}
            <div className="p-3 bg-surface/50 rounded-lg border border-border text-xs flex-shrink-0 max-w-3xl">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-foreground/50">Persona:</span>{' '}
                  <span className="text-foreground/90">{metadata.persona_id}</span>
                </div>
                <div>
                  <span className="text-foreground/50">Mode:</span>{' '}
                  <span className="text-foreground/90">{metadata.mode}</span>
                </div>
                <div>
                  <span className="text-foreground/50">Duration:</span>{' '}
                  <span className="text-foreground/90">
                    {metadata.duration_ms ? `${(metadata.duration_ms / 1000).toFixed(1)}s` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-foreground/50">Events:</span>{' '}
                  <span className="text-foreground/90">{events.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details - Right (40%) */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-lg font-semibold text-foreground/90 mb-3 flex-shrink-0">
              Event Details
            </h3>
            <div className="flex-1 bg-surface/50 rounded-lg border border-border overflow-y-auto min-h-0">
              <EventDetails
                event={currentEvent}
                personaName={metadata.persona_id}
                videoTime={videoTime}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

