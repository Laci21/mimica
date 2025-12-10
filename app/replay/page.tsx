'use client';

/**
 * Replay Page
 * 
 * View completed Playwright runs with synchronized video and events
 */

import { useState, useEffect } from 'react';
import {
  listPlaywrightRuns,
  getPlaywrightRunMetadata,
  getPlaywrightRunEvents,
  getPlaywrightRunVideoUrl,
  RunListItem,
  RunMetadata,
  PlaywrightEvent
} from '@/lib/api/playwright';
import { 
  getStartUnixTime, 
  findCurrentEvent, 
  getVideoTimeForEvent 
} from '@/lib/replay/sync';
import VideoPlayer from '@/components/lab/VideoPlayer';
import EventTimeline from '@/components/lab/EventTimeline';
import EventDetails from '@/components/lab/EventDetails';
import EventList from '@/components/lab/EventList';
import { personas } from '@/lib/data/personas';

export default function ReplayPage() {
  // State for run selection
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);

  // State for current run
  const [metadata, setMetadata] = useState<RunMetadata | null>(null);
  const [events, setEvents] = useState<PlaywrightEvent[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [actualDuration, setActualDuration] = useState(0); // Actual run duration from metadata
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<PlaywrightEvent | null>(null);
  const [startUnix, setStartUnix] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);

  // Load list of runs on mount
  useEffect(() => {
    loadRuns();
  }, []);

  // Load selected run data
  useEffect(() => {
    if (selectedRunId) {
      loadRunData(selectedRunId);
    }
  }, [selectedRunId]);

  // Update current event based on video time
  useEffect(() => {
    if (events.length > 0 && startUnix > 0) {
      const event = findCurrentEvent(events, currentVideoTime, startUnix);
      setCurrentEvent(event);
    }
  }, [currentVideoTime, events, startUnix]);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const runsList = await listPlaywrightRuns();
      setRuns(runsList);
      
      // Auto-select the most recent run
      if (runsList.length > 0 && !selectedRunId) {
        setSelectedRunId(runsList[0].run_id);
      }
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRunData = async (runId: string) => {
    try {
      setLoadingRun(true);
      
      // Load metadata and events in parallel
      const [metadataData, eventsData] = await Promise.all([
        getPlaywrightRunMetadata(runId),
        getPlaywrightRunEvents(runId)
      ]);

      setMetadata(metadataData);
      setEvents(eventsData);
      
      // Calculate start Unix time for synchronization
      const startTime = getStartUnixTime(metadataData.started_at);
      setStartUnix(startTime);

      // Use metadata duration (actual run duration) for timeline
      // This handles cases where video file may be shorter than the actual recording
      const runDuration = metadataData.duration_ms ? metadataData.duration_ms / 1000 : 0;
      setActualDuration(runDuration);

      // Reset playback state
      setCurrentVideoTime(0);
      setCurrentEvent(null);
    } catch (error) {
      console.error('Failed to load run data:', error);
    } finally {
      setLoadingRun(false);
    }
  };

  const handleEventClick = (event: PlaywrightEvent) => {
    // Calculate video time for this event and seek to it
    const videoTime = getVideoTimeForEvent(event, startUnix);
    
    // If event is beyond video duration, seek to the last frame instead
    const clampedTime = videoDuration > 0 ? Math.min(videoTime, videoDuration - 0.1) : videoTime;
    
    setSeekToTime(clampedTime);
    
    // For events beyond video, explicitly set as current event since video won't reach that time
    if (videoTime > videoDuration) {
      setCurrentEvent(event);
    }
  };

  const handleVideoTimeUpdate = (time: number) => {
    setCurrentVideoTime(time);
  };

  const handleVideoDurationChange = (duration: number) => {
    setVideoDuration(duration);
  };

  // Get persona info
  const persona = metadata 
    ? personas.find(p => p.id === metadata.persona_id)
    : null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-foreground/60">Loading runs...</p>
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold text-accent mb-2">No Replays Available</h2>
          <p className="text-foreground/60 mb-4">
            No completed Playwright runs found. Run a simulation in the Lab to create replays.
          </p>
          <a
            href="/lab"
            className="inline-block px-6 py-3 bg-accent hover:bg-accent-light rounded-lg font-medium transition-colors"
          >
            Go to Lab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-accent">Replay Viewer</h1>
            <p className="text-xs text-foreground/50 mt-1">
              Review persona interactions with synchronized video and events
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Run Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-foreground/60">Run:</label>
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm min-w-[300px]"
              >
                {runs.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {run.persona_id} - {new Date(run.started_at).toLocaleString()} ({run.mode})
                  </option>
                ))}
              </select>
            </div>

            <a
              href="/lab"
              className="text-sm px-4 py-2 border border-border hover:bg-surface-light rounded-lg transition-colors"
            >
              ← Back to Lab
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {loadingRun ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-foreground/60">Loading replay...</p>
          </div>
        </div>
      ) : metadata && events.length > 0 ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Video + Timeline + Event List */}
          <div className="w-3/5 border-r border-border flex flex-col overflow-auto">
            {/* Video Player */}
            <div className="p-6 border-b border-border">
              <div className="mb-3">
                <h2 className="text-sm font-medium text-foreground/70 mb-1">
                  Recording: {persona?.name || metadata.persona_id}
                </h2>
                <p className="text-xs text-foreground/50">
                  {new Date(metadata.started_at).toLocaleString()} • 
                  Run: {metadata.duration_ms ? Math.round(metadata.duration_ms / 1000) : 0}s • 
                  Video: {Math.round(videoDuration)}s • 
                  Events: {events.length}
                </p>
              </div>
              
              <VideoPlayer
                videoUrl={getPlaywrightRunVideoUrl(metadata.run_id)}
                onTimeUpdate={handleVideoTimeUpdate}
                onDurationChange={handleVideoDurationChange}
                seekToTime={seekToTime}
              />
            </div>

            {/* Event Timeline */}
            <div className="p-6 border-b border-border">
              <EventTimeline
                events={events}
                currentVideoTime={currentVideoTime}
                videoDuration={videoDuration}
                timelineDuration={actualDuration > 0 ? actualDuration : videoDuration}
                startUnix={startUnix}
                currentEvent={currentEvent}
                onEventClick={handleEventClick}
              />
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-auto">
              <EventList
                events={events}
                currentEvent={currentEvent}
                startUnix={startUnix}
                videoDuration={videoDuration}
                onEventClick={handleEventClick}
              />
            </div>
          </div>

          {/* Right Column: Event Details */}
          <div className="w-2/5 bg-gradient-to-br from-surface to-background">
            <div className="h-full overflow-auto">
              <EventDetails
                event={currentEvent}
                personaName={persona?.name}
                videoTime={currentVideoTime}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-foreground/60">No data available for this run</p>
          </div>
        </div>
      )}
    </div>
  );
}

