import { TKFUpdate, MetadataFilters } from '../types/tkf';

const BACKEND_URL = 'http://localhost:8001';

/**
 * Fetch the full TKF content string
 */
export async function fetchTKFFullContent(): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/tkf/full-content`);
  if (!response.ok) {
    throw new Error(`Failed to fetch TKF full content: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Fetch TKF updates with optional metadata filtering
 * @param metadataFilters - Optional metadata filters (e.g., { session_id: '123', persona_id: '456' })
 */
export async function fetchTKFUpdates(
  metadataFilters?: MetadataFilters
): Promise<TKFUpdate[]> {
  const params = new URLSearchParams();
  
  if (metadataFilters) {
    Object.entries(metadataFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
  }
  
  const url = `${BACKEND_URL}/tkf/updates${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch TKF updates: ${response.statusText}`);
  }
  
  return response.json();
}

