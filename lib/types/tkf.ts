// Backend TKF types matching Python data models

export interface TKFUpdate {
  id: string;
  created_at: string;
  old_text: string;
  new_text: string;
  reasoning: string;
  metadata: Record<string, string>;
}

export interface MetadataFilters {
  [key: string]: string;
}

export interface ClientFilters {
  timeRange: 'all' | 'hour' | 'today' | 'week';
  searchText: string;
}

export interface TKFFilters {
  metadata: MetadataFilters;
  client: ClientFilters;
}

