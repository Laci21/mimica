'use client';

import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import TKFView from '@/components/lab/TKFView';
import ExportModal from '@/components/lab/ExportModal';
import PersonaScorecard from '@/components/lab/PersonaScorecard';
import ThoughtBubble from '@/components/lab/ThoughtBubble';
import InsightStream from '@/components/lab/InsightStream';
import { SimulationProvider, useSimulation } from '@/lib/simulation/SimulationContext';
import { personas } from '@/lib/data/personas';
import { scenarios } from '@/lib/data/scenarios';
import { generateTKFReport } from '@/lib/tkf/export';
import { useState, useEffect } from 'react';

function LabContent() {
  const [uiVersion, setUiVersion] = useState<'v1' | 'v2'>('v1');
  const [showVersionToggle, setShowVersionToggle] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('complete-onboarding');
  const [speed, setSpeed] = useState<number>(1.5);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Hidden keyboard shortcut: Press 'b' (for backup) to toggle version switcher
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        setShowVersionToggle(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const {
    isRunning,
    currentStep,
    allSteps,
    tkfInsights,
    baselineSteps,
    baselineMaxSeverity,
    currentUIStep,
    currentAction,
    latestInsightEvent,
    startSimulation,
    stopSimulation,
    resetTKF,
    setBaseline,
    highlightedElementId,
  } = useSimulation();

  const handleRunSimulation = () => {
    if (!selectedPersonaId) return;
    startSimulation(selectedPersonaId, selectedScenarioId, uiVersion, speed);
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handleSetBaseline = () => {
    setBaseline();
  };

  const tkfReport = generateTKFReport(tkfInsights, allSteps, uiVersion);

  // Calculate current max severity
  const currentMaxSeverity = tkfInsights.length > 0 
    ? Math.max(...tkfInsights.map(i => i.severityScore))
    : 0;

  return (
      <div className="h-screen flex flex-col bg-background">
      {/* Backup Mode Indicator */}
      {showVersionToggle && uiVersion === 'v2' && (
        <div className="bg-warning/20 border-b border-warning/50 px-6 py-2 text-center">
          <p className="text-sm text-warning">
            ⚠️ <strong>Backup Mode Active:</strong> Showing pre-built v2. Press <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">b</kbd> to hide toggle.
          </p>
        </div>
      )}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-accent">Mimica Control Room</h1>
            <p className="text-xs text-foreground/50 mt-1">
              Real-time AI persona testing with live TKF generation
            </p>
          </div>
          <div className="flex items-center gap-4">
            {showVersionToggle && (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-foreground/40">Backup:</span>
                <button
                  onClick={() => setUiVersion('v1')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    uiVersion === 'v1'
                      ? 'bg-accent text-white'
                      : 'bg-surface-light text-foreground/60 hover:bg-border'
                  }`}
                >
                  v1
                </button>
                <button
                  onClick={() => setUiVersion('v2')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    uiVersion === 'v2'
                      ? 'bg-accent text-white'
                      : 'bg-surface-light text-foreground/60 hover:bg-border'
                  }`}
                >
                  v2
                </button>
              </div>
            )}
            <div className="text-sm text-foreground/60">
              Hackathon Demo
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Controls + UI Preview with Thought Bubbles */}
        <div className="w-1/2 border-r border-border flex flex-col p-6">
          {/* Compact Controls - Vertical Stack */}
          <div className="mb-4 space-y-3">
            {/* Persona Selector */}
            <div>
              <label className="text-xs font-medium text-foreground/60 block mb-2">Select Persona</label>
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg disabled:opacity-50"
              >
                <option value="">Choose a persona...</option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} - {persona.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-3">
              {/* Speed Control */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/60">Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    disabled={isRunning}
                    className="flex-1"
                  />
                  <span className="text-xs font-medium w-8">{speed}x</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleRunSimulation}
                  disabled={!selectedPersonaId || isRunning}
                  className="px-4 py-2 text-sm bg-accent hover:bg-accent-light transition-colors rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? '⏸ Running' : '▶ Run'}
                </button>
                {allSteps.length > 0 && baselineSteps.length === 0 && (
                  <button
                    onClick={handleSetBaseline}
                    className="px-3 py-2 text-sm rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
                    title="Set as baseline for comparison"
                  >
                    ⭐
                  </button>
                )}
                {tkfInsights.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="px-3 py-2 text-sm border border-border hover:bg-surface-light transition-colors rounded-lg"
                    title="Export TKF report"
                  >
                    📤
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* UI Preview */}
          <div className="flex-1 flex flex-col">
            <div className="mb-3">
              <h2 className="text-sm font-medium text-foreground/70 mb-1">Target Application</h2>
              <p className="text-xs text-foreground/50">
                <span className="text-accent font-mono">localhost:3000/app</span>
                {showVersionToggle && (
                  <span className="text-warning ml-2">
                    ({uiVersion === 'v2' ? 'Backup v2' : 'Live v1'})
                  </span>
                )}
              </p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-background to-surface rounded-lg border border-border overflow-auto relative">
            <div className="min-h-full flex items-center justify-center p-6">
              <OnboardingFlow
                version={uiVersion}
                highlightElementId={highlightedElementId || undefined}
                simulationStep={isRunning ? currentUIStep : undefined}
                simulationAction={isRunning ? currentAction || undefined : undefined}
              />
            </div>

            {/* Thought Bubble Overlay - THE STAR! */}
            {currentStep && highlightedElementId && (
              <ThoughtBubble
                step={currentStep}
                targetElementId={highlightedElementId}
              />
            )}
            </div>
          </div>
        </div>

        {/* Right Column: Scorecard + TKF */}
        <div className="w-1/2 flex flex-col">

          {/* Scorecard (when available) */}
          {allSteps.length > 0 && (
            <div className="p-6 border-b border-border bg-gradient-to-br from-surface to-background">
              <PersonaScorecard
                currentSteps={allSteps}
                baselineSteps={baselineSteps.length > 0 ? baselineSteps : undefined}
                maxSeverity={currentMaxSeverity}
                baselineMaxSeverity={baselineSteps.length > 0 ? baselineMaxSeverity : undefined}
              />
            </div>
          )}

          {/* TKF - The Star of the Show */}
          <div className="flex-1 overflow-auto p-6 relative">
            {/* Flow Animation Overlay */}
            <InsightStream event={latestInsightEvent} />
            
            {tkfInsights.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-accent mb-1">
                      Trusted Knowledge Fabric
                    </h2>
                    <p className="text-sm text-foreground/60">
                      Real-time insights from persona interactions
                    </p>
                  </div>
                  <button
                    onClick={resetTKF}
                    className="text-xs px-3 py-1 rounded border border-border hover:bg-surface-light transition-colors"
                  >
                    Clear TKF
                  </button>
                </div>
                <TKFView insights={tkfInsights} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-4">🧵</div>
                  <h3 className="text-xl font-semibold mb-2 text-accent">
                    Trusted Knowledge Fabric
                  </h3>
                  <p className="text-foreground/60 text-sm">
                    The TKF will weave as personas interact with your UI. 
                    Each insight captures confusion, friction, or delight moments.
                  </p>
                  <p className="text-foreground/50 text-xs mt-4">
                    Select a persona and run a simulation to start building knowledge.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="border-t border-border p-6 bg-surface">
            <button
              onClick={handleExport}
              disabled={tkfInsights.length === 0}
              className="w-full px-4 py-3 bg-accent-dark hover:bg-accent transition-colors rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export TKF to Coding Agent {tkfInsights.length > 0 && `(${tkfInsights.length} insights)`}
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        report={tkfReport}
      />
    </div>
  );
}

export default function LabPage() {
  return (
    <SimulationProvider>
      <LabContent />
    </SimulationProvider>
  );
}

