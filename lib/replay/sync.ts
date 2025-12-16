/**
 * Synchronization utilities for video replay with events
 * 
 * Handles time calculations and event matching for video playback
 */

import { PlaywrightEvent } from '@/lib/api/playwright';

/**
 * Convert ISO timestamp to Unix seconds
 * Handles ISO strings without timezone by treating them as UTC
 */
export function getStartUnixTime(isoString: string): number {
  // If the ISO string doesn't have a timezone indicator (Z or offset), append 'Z' to treat it as UTC
  // This ensures consistency with event timestamps which are Unix timestamps (UTC)
  let normalizedString = isoString;
  
  if (!isoString.endsWith('Z') && !isoString.match(/[+-]\d{2}:\d{2}$/)) {
    normalizedString = isoString + 'Z';
  }
  
  return new Date(normalizedString).getTime() / 1000;
}

/**
 * Calculate video time offset for an event
 * 
 * @param event - The playwright event
 * @param startUnix - Unix timestamp (seconds) when the video/run started
 * @returns Video time in seconds
 */
export function getVideoTimeForEvent(event: PlaywrightEvent, startUnix: number): number {
  // Prefer elapsed if available (more accurate for sync with TKF)
  if (event.elapsed !== undefined) {
    return event.elapsed;
  }
  // Fallback to timestamp calculation
  return event.timestamp - startUnix;
}

/**
 * Find the current event based on video time
 * Returns the most recent event that has already occurred at the current video time
 * 
 * @param events - Array of playwright events (should be sorted by timestamp)
 * @param videoTime - Current video time in seconds
 * @param startUnix - Unix timestamp when the run started
 * @param tolerance - Time tolerance in seconds (default 0.1s)
 * @returns The current event or null if none match
 */
export function findCurrentEvent(
  events: PlaywrightEvent[],
  videoTime: number,
  startUnix: number,
  tolerance: number = 0.1
): PlaywrightEvent | null {
  if (events.length === 0) return null;

  // Find the latest event that occurred before or at current video time
  let currentEvent: PlaywrightEvent | null = null;
  
  for (const event of events) {
    const eventVideoTime = getVideoTimeForEvent(event, startUnix);
    
    // Event happens before current time (with tolerance)
    if (eventVideoTime <= videoTime + tolerance) {
      currentEvent = event;
    } else {
      // Events are sorted, so we can break early
      break;
    }
  }
  
  return currentEvent;
}

/**
 * Find the next event after current video time
 * 
 * @param events - Array of playwright events (should be sorted by timestamp)
 * @param videoTime - Current video time in seconds
 * @param startUnix - Unix timestamp when the run started
 * @returns The next event or null if there are no more events
 */
export function findNextEvent(
  events: PlaywrightEvent[],
  videoTime: number,
  startUnix: number
): PlaywrightEvent | null {
  if (events.length === 0) return null;

  for (const event of events) {
    const eventVideoTime = getVideoTimeForEvent(event, startUnix);
    
    if (eventVideoTime > videoTime) {
      return event;
    }
  }
  
  return null;
}

/**
 * Format time in seconds to MM:SS format
 * 
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get color for event status
 * 
 * @param status - Event status
 * @returns Tailwind color class
 */
export function getEventStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-green-500 bg-green-500/20 border-green-500';
    case 'confused':
      return 'text-yellow-500 bg-yellow-500/20 border-yellow-500';
    case 'blocked':
      return 'text-red-500 bg-red-500/20 border-red-500';
    case 'delighted':
      return 'text-blue-500 bg-blue-500/20 border-blue-500';
    default:
      return 'text-foreground/60 bg-surface border-border';
  }
}

/**
 * Get marker color for event status (for timeline)
 * 
 * @param status - Event status
 * @returns CSS color value
 */
export function getEventMarkerColor(status: string): string {
  switch (status) {
    case 'success':
      return '#22c55e'; // green-500
    case 'confused':
      return '#eab308'; // yellow-500
    case 'blocked':
      return '#ef4444'; // red-500
    case 'delighted':
      return '#3b82f6'; // blue-500
    default:
      return '#9ca3af'; // gray-400
  }
}

