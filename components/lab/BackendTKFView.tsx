'use client';

import { useState, useEffect, useCallback } from 'react';
import { TKFUpdate, MetadataFilters, ClientFilters } from '@/lib/types/tkf';
import { fetchTKFFullContent, fetchTKFUpdates } from '@/lib/api/tkf';
import TKFFilters from './TKFFilters';
import TKFUpdateCard from './TKFUpdateCard';

export default function BackendTKFView() {
  const [fullContent, setFullContent] = useState<string>('');
  const [allUpdates, setAllUpdates] = useState<TKFUpdate[]>([]);
  const [filteredUpdates, setFilteredUpdates] = useState<TKFUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Filter states
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilters>({});
  const [clientFilters, setClientFilters] = useState<ClientFilters>({
    timeRange: 'all',
    searchText: '',
  });

  // Extract available metadata keys from all updates
  const availableMetadataKeys = Array.from(
    new Set(
      allUpdates.flatMap((update) => Object.keys(update.metadata))
    )
  ).sort();

  // Fetch data from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [content, updates] = await Promise.all([
        fetchTKFFullContent(),
        fetchTKFUpdates(metadataFilters),
      ]);
      
      setFullContent(content);
      setAllUpdates(updates);
      setLastFetchTime(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch TKF data');
    } finally {
      setIsLoading(false);
    }
  }, [metadataFilters]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply client-side filters
  useEffect(() => {
    let filtered = [...allUpdates];

    // Time range filter
    if (clientFilters.timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (clientFilters.timeRange) {
        case 'hour':
          cutoff.setHours(now.getHours() - 1);
          break;
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
      }
      
      filtered = filtered.filter(
        (update) => new Date(update.created_at) >= cutoff
      );
    }

    // Text search filter
    if (clientFilters.searchText) {
      const searchLower = clientFilters.searchText.toLowerCase();
      filtered = filtered.filter(
        (update) =>
          update.reasoning.toLowerCase().includes(searchLower) ||
          update.old_text.toLowerCase().includes(searchLower) ||
          update.new_text.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredUpdates(filtered);
  }, [allUpdates, clientFilters]);

  const handleClearAllFilters = () => {
    setMetadataFilters({});
    setClientFilters({ timeRange: 'all', searchText: '' });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      {/* Left Panel: Current Content - LARGER (65%) */}
      <div className="w-[65%] flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-accent">
              Current Knowledge
            </h2>
            <p className="text-sm text-foreground/60 mt-1">
              The accumulated common knowledge
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastFetchTime && (
              <span className="text-xs text-foreground/40">
                {lastFetchTime.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={copyToClipboard}
              className={`text-xs px-3 py-1.5 rounded border transition-all ${
                copied 
                  ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                  : 'border-border hover:bg-surface-light'
              }`}
              title="Copy to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-surface border border-border rounded-lg p-6 overflow-y-auto overflow-x-hidden min-h-0 shadow-sm">
          {isLoading && !fullContent ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-foreground/40">Loading...</div>
            </div>
          ) : fullContent ? (
            <pre className="text-sm font-mono text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
              {fullContent}
            </pre>
          ) : (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="text-5xl mb-3">📝</div>
                <p className="text-foreground/60">No content yet</p>
                <p className="text-xs text-foreground/40 mt-2">
                  Knowledge will accumulate as you run tests
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Updates History - COMPACT (35%) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-foreground/90">
              Evolution History
            </h3>
            <p className="text-xs text-foreground/50 mt-0.5">
              {filteredUpdates.length} of {allUpdates.length} updates
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-light transition-colors disabled:opacity-50"
            title="Refresh"
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex-shrink-0">
            {error}
          </div>
        )}

        {/* Filters - Horizontal Compact */}
        <div className="mb-3 flex-shrink-0">
          <TKFFilters
            availableMetadataKeys={availableMetadataKeys}
            metadataFilters={metadataFilters}
            clientFilters={clientFilters}
            onMetadataFilterChange={setMetadataFilters}
            onClientFilterChange={setClientFilters}
            onClearAll={handleClearAllFilters}
            totalCount={allUpdates.length}
            filteredCount={filteredUpdates.length}
          />
        </div>

        {/* Updates List - Single Column for Cleaner Look */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {isLoading && allUpdates.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="text-3xl mb-3">⏳</div>
                <p className="text-xs text-foreground/40">Loading...</p>
              </div>
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="text-3xl mb-3">
                  {allUpdates.length === 0 ? '📝' : '🔍'}
                </div>
                <p className="text-sm text-foreground/60 mb-1">
                  {allUpdates.length === 0
                    ? 'No updates yet'
                    : 'No matches'}
                </p>
                <p className="text-xs text-foreground/40">
                  {allUpdates.length === 0
                    ? 'Updates appear as TKF evolves'
                    : 'Adjust filters'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUpdates.map((update) => (
                <TKFUpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

