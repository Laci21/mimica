'use client';

import { TKFUpdate } from '@/lib/types/tkf';
import { useState } from 'react';

interface TKFUpdateCardProps {
  update: TKFUpdate;
}

export default function TKFUpdateCard({ update }: TKFUpdateCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Format timestamp
  const timestamp = new Date(update.created_at).toLocaleString();

  return (
    <div 
      className={`p-2.5 rounded border border-border bg-surface/50 hover:bg-surface hover:border-accent/30 transition-all cursor-pointer ${
        !isOpen ? 'h-[90px]' : ''
      } flex flex-col`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Header - Always visible */}
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 text-accent self-start mt-0.5 text-xs">
          {isOpen ? '▼' : '▶'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground/90 font-medium line-clamp-2 mb-1 leading-tight">
            {update.reasoning}
          </div>
          <div className="text-[10px] text-foreground/40">
            {timestamp}
          </div>
        </div>
      </div>

      {/* Collapsed View - Metadata Preview */}
      {!isOpen && Object.keys(update.metadata).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
          {Object.entries(update.metadata).slice(0, 2).map(([key, value]) => (
            <span
              key={key}
              className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/90"
            >
              {key}: {value}
            </span>
          ))}
          {Object.keys(update.metadata).length > 2 && (
            <span className="text-[9px] text-foreground/30">
              +{Object.keys(update.metadata).length - 2}
            </span>
          )}
        </div>
      )}

      {/* Expanded Content - Inline */}
      {isOpen && (
        <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-2 ml-5">
          {/* Full Metadata badges */}
          {Object.keys(update.metadata).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(update.metadata).map(([key, value]) => (
                <span
                  key={key}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/90"
                >
                  {key}: {value}
                </span>
              ))}
            </div>
          )}

          {/* Text Changes - Diff Style - Compact */}
          <div className="space-y-1.5">
            {/* Old Text */}
            <div className="rounded bg-red-500/5 border border-red-500/20 p-1.5">
              <div className="text-[9px] uppercase text-red-400/80 mb-1">- Old</div>
              <pre className="text-[10px] text-red-300/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {update.old_text}
              </pre>
            </div>

            {/* New Text */}
            <div className="rounded bg-green-500/5 border border-green-500/20 p-1.5">
              <div className="text-[9px] uppercase text-green-400/80 mb-1">+ New</div>
              <pre className="text-[10px] text-green-300/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {update.new_text}
              </pre>
            </div>
          </div>

          {/* ID footer */}
          <div className="text-[9px] text-foreground/20 font-mono pt-1">
            {update.id}
          </div>
        </div>
      )}
    </div>
  );
}

