'use client';

import BackendTKFView from '@/components/lab/BackendTKFView';
import ReplayViewer from '@/components/lab/ReplayViewer';
import ExportModal from '@/components/lab/ExportModal';
import { useState, useEffect } from 'react';
import { fetchTKFFullContent } from '@/lib/api/tkf';
import { 
  listPlaywrightRuns, 
  getPlaywrightRunEvents,
  getPlaywrightRunMetadata,
  type RunListItem,
  type PlaywrightEvent 
} from '@/lib/api/playwright';

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<'replays' | 'tkf'>('replays');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportReport, setExportReport] = useState('');
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  // Load available runs
  useEffect(() => {
    const loadRuns = async () => {
      try {
        const runList = await listPlaywrightRuns();
        setRuns(runList);
        if (runList.length > 0 && !selectedRunId) {
          setSelectedRunId(runList[0].run_id);
        }
      } catch (error) {
        console.error('Failed to load runs:', error);
      }
    };
    loadRuns();
  }, []);

  // Generate export report with insights from selected run
  const generateReport = async () => {
    try {
      const fullContent = await fetchTKFFullContent();
      
      // Generate report with TKF content
      let report = `# Knowledge & Insights Report\n\n`;
      report += `**Generated**: ${new Date().toLocaleString()}\n\n`;
      report += `---\n\n`;
      
      report += `## Current Common Knowledge\n\n`;
      report += `The Trusted Knowledge Fabric contains the following accumulated knowledge:\n\n`;
      report += `\`\`\`\n${fullContent}\n\`\`\`\n\n`;
      
      // Add insights from selected run if available
      if (selectedRunId) {
        try {
          const [metadata, events] = await Promise.all([
            getPlaywrightRunMetadata(selectedRunId),
            getPlaywrightRunEvents(selectedRunId)
          ]);
          
          report += `---\n\n`;
          report += `## Insights from Recent Run\n\n`;
          report += `**Run ID**: ${metadata.run_id}\n`;
          report += `**Persona**: ${metadata.persona_id}\n`;
          report += `**Mode**: ${metadata.mode}\n`;
          report += `**Date**: ${new Date(metadata.started_at).toLocaleString()}\n`;
          report += `**Duration**: ${metadata.duration_ms ? `${(metadata.duration_ms / 1000).toFixed(1)}s` : 'N/A'}\n`;
          report += `**Total Events**: ${events.length}\n\n`;
          
          // Analyze events for insights
          const confusedEvents = events.filter(e => e.status === 'confused');
          const blockedEvents = events.filter(e => e.status === 'blocked');
          const delightedEvents = events.filter(e => e.status === 'delighted');
          const successEvents = events.filter(e => e.status === 'success');
          
          report += `### Event Summary\n\n`;
          report += `- ✅ **Success**: ${successEvents.length} events\n`;
          report += `- 🤔 **Confused**: ${confusedEvents.length} events\n`;
          report += `- 🚫 **Blocked**: ${blockedEvents.length} events\n`;
          report += `- ✨ **Delighted**: ${delightedEvents.length} events\n\n`;
          
          // Show confused/blocked events as they indicate UX issues
          if (confusedEvents.length > 0 || blockedEvents.length > 0) {
            report += `### UX Issues Detected\n\n`;
            
            if (blockedEvents.length > 0) {
              report += `**Blocked Events** (${blockedEvents.length}):\n\n`;
              blockedEvents.slice(0, 5).forEach((event, idx) => {
                report += `${idx + 1}. **${event.action}** at \`${event.target_element_id || event.target_selector}\`\n`;
                report += `   - "${event.reasoning_text}"\n\n`;
              });
            }
            
            if (confusedEvents.length > 0) {
              report += `**Confusion Points** (${confusedEvents.length}):\n\n`;
              confusedEvents.slice(0, 5).forEach((event, idx) => {
                report += `${idx + 1}. **${event.action}** at \`${event.target_element_id || event.target_selector}\`\n`;
                report += `   - "${event.reasoning_text}"\n\n`;
              });
            }
          }
          
          // Show delighted events as positive feedback
          if (delightedEvents.length > 0) {
            report += `### Positive Experiences\n\n`;
            delightedEvents.slice(0, 3).forEach((event, idx) => {
              report += `${idx + 1}. **${event.action}** at \`${event.target_element_id || event.target_selector}\`\n`;
              report += `   - "${event.reasoning_text}"\n\n`;
            });
          }
        } catch (error) {
          console.warn('Could not load run insights:', error);
        }
      }
      
      report += `---\n\n`;
      report += `## Recommendations\n\n`;
      report += `Use this knowledge and insights to:\n`;
      report += `- Address UX issues identified in blocked/confused events\n`;
      report += `- Reinforce positive experiences from delighted events\n`;
      report += `- Update the knowledge fabric based on findings\n`;
      
      setExportReport(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setExportReport('# Error\n\nFailed to generate report. Please try again.');
    }
  };

  const handleExport = async () => {
    await generateReport();
    setIsExportModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-accent">Analysis Lab</h1>
            <p className="text-xs text-foreground/50 mt-1">
              View test replays and analyze knowledge fabric
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Run Selector */}
            {runs.length > 0 && (
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:border-accent focus:outline-none min-w-[250px]"
              >
                {runs.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {run.persona_id} - {new Date(run.started_at).toLocaleString()}
                  </option>
                ))}
              </select>
            )}
            <a
              href="/run"
              className="px-4 py-2 bg-accent hover:bg-accent-light rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              ▶ Run New Test
            </a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-surface px-6 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('replays')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              activeTab === 'replays'
                ? 'bg-accent text-white'
                : 'bg-background hover:bg-surface-light'
            }`}
          >
            🎬 Replays
          </button>
          <button
            onClick={() => setActiveTab('tkf')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              activeTab === 'tkf'
                ? 'bg-accent text-white'
                : 'bg-background hover:bg-surface-light'
            }`}
          >
            🧵 Trusted Knowledge Fabric
          </button>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'replays' ? (
            <ReplayViewer selectedRunId={selectedRunId} onRunChange={setSelectedRunId} runs={runs} />
          ) : (
            <BackendTKFView />
          )}
        </div>
        
        {/* Export Button - Only show on TKF tab */}
        {activeTab === 'tkf' && (
          <div className="border-t border-border bg-surface px-6 py-4 flex-shrink-0">
            <button
              onClick={handleExport}
              className="w-full px-4 py-3 bg-accent hover:bg-accent-light transition-colors rounded-lg font-semibold"
            >
              📤 Export Knowledge Report to Coding Agent
            </button>
          </div>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        report={exportReport}
      />
    </div>
  );
}
