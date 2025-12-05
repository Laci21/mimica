'use client';

import { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: string;
}

export default function ExportModal({ isOpen, onClose, report }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tkf-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Export TKF to Coding Agent</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Copy this report and paste it into Cursor to improve your UI
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-background font-mono text-sm">
          <pre className="whitespace-pre-wrap text-foreground/90">{report}</pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-surface">
          <div className="text-sm text-foreground/60">
            {report.split('\n').length} lines • {Math.ceil(report.length / 4)} tokens (approx)
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg border border-border hover:bg-surface-light transition-colors"
            >
              Download .md
            </button>
            <button
              onClick={handleCopy}
              className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-light transition-colors font-semibold"
            >
              {copied ? '✓ Copied!' : 'Copy for Cursor'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-6">
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-accent-light">🔄 Live Hot-Reload Workflow:</h3>
            <ol className="text-sm text-foreground/80 space-y-2 list-decimal list-inside">
              <li>Click <strong>"Copy for Cursor"</strong> above</li>
              <li>In Cursor, open <code className="text-accent bg-background px-1 rounded">components/onboarding/OnboardingFlow.tsx</code></li>
              <li>Open Cursor chat (Cmd/Ctrl + L)</li>
              <li>Paste the report and ask: <em>"Please implement these UX improvements to the v1 variant"</em></li>
              <li>Review the proposed changes and <strong>apply them</strong></li>
              <li><strong>Save the file</strong> - Next.js will auto hot-reload</li>
              <li>Return to this Mimica Control Room - the preview will show the improved UI automatically!</li>
              <li>Re-run the same personas to validate improvements</li>
            </ol>
            <div className="mt-3 pt-3 border-t border-accent/20">
              <p className="text-xs text-foreground/60">
                💡 <strong>Backup:</strong> Press <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-accent">b</kbd> to reveal 
                the version toggle (v2 is a pre-built fallback if hot-reload fails)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

