/**
 * TKF-Event synchronization utilities for replay
 * 
 * Handles time-based matching between TKF updates and Playwright events
 */

import { PlaywrightEvent } from '@/lib/api/playwright';
import { TKFUpdate } from '@/lib/types/tkf';

/**
 * Default epsilon for time-based matching (seconds)
 * TKF updates and events within this tolerance are considered "at the same time"
 */
export const DEFAULT_EPSILON = 0.10;

/**
 * Extract elapsed time from a TKF update's metadata
 * Returns undefined if not present or not parseable
 */
export function getTKFUpdateElapsed(update: TKFUpdate): number | undefined {
  const elapsed = update.metadata.elapsed;
  
  if (typeof elapsed === 'number') {
    return elapsed;
  }
  
  if (typeof elapsed === 'string') {
    const parsed = parseFloat(elapsed);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  return undefined;
}

/**
 * Extract elapsed time from a Playwright event
 * Falls back to undefined if not present
 */
export function getEventElapsed(event: PlaywrightEvent): number | undefined {
  return event.elapsed;
}

/**
 * Find the current TKF update based on video time and current event
 * 
 * Strategy:
 * 1. If there's a current event, try to find a TKF update with matching elapsed time (within epsilon)
 * 2. Otherwise, find the latest update at or before video time
 * 
 * @param updates - Array of TKF updates (should be sorted by elapsed)
 * @param videoTime - Current video time in seconds
 * @param currentEvent - Current Playwright event (if any)
 * @param epsilon - Time tolerance in seconds
 */
export function findCurrentTKFUpdate(
  updates: TKFUpdate[],
  videoTime: number,
  currentEvent: PlaywrightEvent | null,
  epsilon: number = DEFAULT_EPSILON
): TKFUpdate | null {
  if (updates.length === 0) return null;

  // Strategy 1: Match by current event if available
  if (currentEvent) {
    const eventElapsed = getEventElapsed(currentEvent);
    
    if (eventElapsed !== undefined) {
      // Find TKF update closest to this event's elapsed time
      const matchingUpdate = updates.find(update => {
        const updateElapsed = getTKFUpdateElapsed(update);
        return updateElapsed !== undefined && 
               Math.abs(updateElapsed - eventElapsed) <= epsilon;
      });
      
      if (matchingUpdate) {
        return matchingUpdate;
      }
    }
  }

  // Strategy 2: Find latest update at or before video time
  let currentUpdate: TKFUpdate | null = null;
  
  for (const update of updates) {
    const updateElapsed = getTKFUpdateElapsed(update);
    
    if (updateElapsed === undefined) continue;
    
    // Update happens before or at current time (with tolerance)
    if (updateElapsed <= videoTime + epsilon) {
      currentUpdate = update;
    } else {
      // Updates are sorted, so we can break early
      break;
    }
  }
  
  return currentUpdate;
}

/**
 * Find the nearest N events to a TKF update by elapsed time
 * 
 * @param update - The TKF update
 * @param events - Array of Playwright events
 * @param maxCount - Maximum number of events to return (default 3)
 */
export function findNearestEvents(
  update: TKFUpdate,
  events: PlaywrightEvent[],
  maxCount: number = 3
): PlaywrightEvent[] {
  const updateElapsed = getTKFUpdateElapsed(update);
  
  if (updateElapsed === undefined || events.length === 0) {
    return [];
  }

  // Calculate distance for each event and sort by distance
  const eventsWithDistance = events
    .map(event => {
      const eventElapsed = getEventElapsed(event);
      const distance = eventElapsed !== undefined 
        ? Math.abs(eventElapsed - updateElapsed)
        : Infinity;
      return { event, distance };
    })
    .filter(item => item.distance !== Infinity)
    .sort((a, b) => a.distance - b.distance);

  return eventsWithDistance
    .slice(0, maxCount)
    .map(item => item.event);
}

/**
 * Sort TKF updates by elapsed time (ascending)
 */
export function sortTKFUpdatesByElapsed(updates: TKFUpdate[]): TKFUpdate[] {
  return [...updates].sort((a, b) => {
    const aElapsed = getTKFUpdateElapsed(a) ?? Infinity;
    const bElapsed = getTKFUpdateElapsed(b) ?? Infinity;
    return aElapsed - bElapsed;
  });
}


