'use client';

import { MetadataFilters, ClientFilters } from '@/lib/types/tkf';
import { useState, useEffect } from 'react';

interface TKFFiltersProps {
  availableMetadataKeys: string[];
  metadataFilters: MetadataFilters;
  clientFilters: ClientFilters;
  onMetadataFilterChange: (filters: MetadataFilters) => void;
  onClientFilterChange: (filters: ClientFilters) => void;
  onClearAll: () => void;
  totalCount: number;
  filteredCount: number;
}

export default function TKFFilters({
  availableMetadataKeys,
  metadataFilters,
  clientFilters,
  onMetadataFilterChange,
  onClientFilterChange,
  onClearAll,
  totalCount,
  filteredCount,
}: TKFFiltersProps) {
  const [searchInput, setSearchInput] = useState(clientFilters.searchText);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onClientFilterChange({ ...clientFilters, searchText: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleMetadataChange = (key: string, value: string) => {
    const newFilters = { ...metadataFilters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    onMetadataFilterChange(newFilters);
  };

  const handleTimeRangeChange = (timeRange: ClientFilters['timeRange']) => {
    onClientFilterChange({ ...clientFilters, timeRange });
  };

  const hasActiveFilters = 
    Object.keys(metadataFilters).length > 0 ||
    clientFilters.timeRange !== 'all' ||
    clientFilters.searchText !== '';

  return (
    <div className="bg-surface/50 border border-border rounded-lg p-3">
      {/* Collapsed View */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-foreground/90 hover:text-accent transition-colors flex items-center gap-2"
          >
            <span>{isExpanded ? '▼' : '▶'}</span>
            Filters
          </button>
          <span className="text-xs text-foreground/50">
            {filteredCount} of {totalCount}
          </span>
          {hasActiveFilters && !isExpanded && (
            <span className="text-xs text-accent">
              ({Object.keys(metadataFilters).length + (clientFilters.timeRange !== 'all' ? 1 : 0) + (clientFilters.searchText ? 1 : 0)} active)
            </span>
          )}
        </div>
        {hasActiveFilters && !isExpanded && (
          <button
            onClick={onClearAll}
            className="text-xs text-accent hover:text-accent-light transition-colors px-2 py-1"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-4 flex-wrap">

        {/* Metadata Filters (Server-side) */}
        {availableMetadataKeys.length > 0 && availableMetadataKeys.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <label className="text-xs text-foreground/60">{key}:</label>
            <input
              type="text"
              value={metadataFilters[key] || ''}
              onChange={(e) => handleMetadataChange(key, e.target.value)}
              placeholder={`Filter...`}
              className="w-32 px-2 py-1 text-xs bg-surface border border-border rounded focus:border-accent focus:outline-none"
            />
          </div>
        ))}

        {/* Time Range Filter (Client-side) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/60">Time:</span>
          <div className="flex gap-1">
            {(['all', 'hour', 'today', 'week'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  clientFilters.timeRange === range
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border hover:border-accent/50'
                }`}
              >
                {range === 'all' && 'All'}
                {range === 'hour' && '1h'}
                {range === 'today' && 'Today'}
                {range === 'week' && '7d'}
              </button>
            ))}
          </div>
        </div>

        {/* Text Search Filter (Client-side) */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs text-foreground/60">Search:</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search reasoning, text..."
            className="flex-1 px-2 py-1 text-xs bg-surface border border-border rounded focus:border-accent focus:outline-none"
          />
        </div>

            {/* Clear All */}
            {hasActiveFilters && (
              <button
                onClick={onClearAll}
                className="text-xs text-accent hover:text-accent-light transition-colors px-2 py-1"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {Object.entries(metadataFilters).map(([key, value]) => (
                  <span
                    key={key}
                    className="text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 flex items-center gap-1"
                  >
                    {key}: {value}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMetadataChange(key, '');
                      }}
                      className="hover:text-accent-light"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {clientFilters.timeRange !== 'all' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    {clientFilters.timeRange === 'hour' && 'Last Hour'}
                    {clientFilters.timeRange === 'today' && 'Today'}
                    {clientFilters.timeRange === 'week' && 'Last 7 Days'}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTimeRangeChange('all');
                      }}
                      className="hover:text-purple-200"
                    >
                      ×
                    </button>
                  </span>
                )}
                {clientFilters.searchText && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    Search: {clientFilters.searchText}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchInput('');
                      }}
                      className="hover:text-purple-200"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

