'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startPlaywrightRun, pollPlaywrightRunCompletion } from '@/lib/api/playwright';

interface BackendPersona {
  id: string;
  displayName: string;
  description: string;
  llmPrompt?: any;
  behavior?: any;
  meta?: any;
}

function RunContent() {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('onboarding');
  // Hidden for now - defaulting to scripted mode
  const [selectedMode] = useState<'scripted' | 'llm-driven'>('scripted');
  // const [selectedMode, setSelectedMode] = useState<'scripted' | 'llm-driven'>('scripted');
  const [uiVersion, setUiVersion] = useState<'v1' | 'v2'>('v1');
  const [personas, setPersonas] = useState<BackendPersona[]>([]);
  const [runProgress, setRunProgress] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const router = useRouter();

  // Fetch personas from backend on mount
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await fetch('http://localhost:8001/persona');
        if (response.ok) {
          const personasData: BackendPersona[] = await response.json();
          setPersonas(personasData);
        } else {
          console.error('Failed to fetch personas:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch personas:', error);
      } finally {
        setIsLoadingPersonas(false);
      }
    };

    fetchPersonas();
  }, []);

  const handleRunSimulation = async () => {
    if (!selectedPersonaId) return;
    
    try {
      setIsRunning(true);
      setRunProgress('Starting run...');
      
      const response = await startPlaywrightRun({
        persona_id: selectedPersonaId,
        scenario_id: selectedScenarioId,
        ui_version: uiVersion,
        mode: selectedMode,
        headless: false,  // Show browser during run
      });
      
      setRunProgress('Running...');
      
      // Poll for completion
      const finalMetadata = await pollPlaywrightRunCompletion(response.run_id, (metadata) => {
        const eventCount = metadata.metadata?.eventCount || 0;
        setRunProgress(`Running... ${eventCount} events`);
      });
      
      setRunProgress('Complete!');
      
      // Redirect to lab with the run_id
      setTimeout(() => {
        router.push(`/lab?run_id=${response.run_id}`);
      }, 1000);
    } catch (error) {
      console.error('Run failed:', error);
      setRunProgress(`Error: ${error instanceof Error ? error.message : 'Run failed'}`);
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-accent">Run New Simulation</h1>
            <p className="text-xs text-foreground/50 mt-1">
              Execute persona tests against your application
            </p>
          </div>
          <a
            href="/lab"
            className="text-sm text-foreground/60 hover:text-accent transition-colors"
          >
            ← Back to Lab
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-surface border border-border rounded-lg p-8">
            {/* Loading State */}
            {isLoadingPersonas && (
              <div className="mb-6 p-4 rounded-lg bg-surface-light border border-border">
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-accent text-2xl">⏳</div>
                  <p className="text-sm text-foreground/60">Loading personas...</p>
                </div>
              </div>
            )}

            {/* Status Display */}
            {isRunning && (
              <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-accent text-2xl">⏳</div>
                  <div>
                    <p className="text-sm font-medium text-accent">
                      Run in Progress...
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {runProgress}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Persona Selector */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground/90 block mb-2">
                Select Persona
              </label>
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                disabled={isRunning || isLoadingPersonas}
                className="w-full px-4 py-3 text-sm bg-background border border-border rounded-lg disabled:opacity-50 focus:border-accent focus:outline-none"
              >
                <option value="">Choose a persona...</option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.displayName} - {persona.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selector - Hidden for now, defaulting to scripted */}
            {/* <div className="mb-6">
              <label className="text-sm font-medium text-foreground/90 block mb-2">
                Execution Mode
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode('scripted')}
                  disabled={isRunning}
                  className={`flex-1 px-4 py-3 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    selectedMode === 'scripted'
                      ? 'bg-accent text-white'
                      : 'bg-background border border-border hover:bg-surface'
                  }`}
                >
                  Scripted
                  <span className="block text-xs font-normal opacity-70 mt-1">
                    Fast, pre-recorded flow
                  </span>
                </button>
                <button
                  onClick={() => setSelectedMode('llm-driven')}
                  disabled={isRunning}
                  className={`flex-1 px-4 py-3 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    selectedMode === 'llm-driven'
                      ? 'bg-accent text-white'
                      : 'bg-background border border-border hover:bg-surface'
                  }`}
                >
                  LLM-Driven
                  <span className="block text-xs font-normal opacity-70 mt-1">
                    AI-powered, adaptive
                  </span>
                </button>
              </div>
            </div> */}

            {/* Scenario Selector - Hidden for now (only one scenario) */}
            {/* TODO: Re-enable when multiple scenarios are available */}

            {/* UI Version Selector */}
            <div className="mb-8">
              <label className="text-sm font-medium text-foreground/90 block mb-2">
                UI Version
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setUiVersion('v1')}
                  disabled={isRunning}
                  className={`flex-1 px-4 py-3 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    uiVersion === 'v1'
                      ? 'bg-accent text-white'
                      : 'bg-background border border-border hover:bg-surface'
                  }`}
                >
                  Version 1
                </button>
                <button
                  onClick={() => setUiVersion('v2')}
                  disabled={isRunning}
                  className={`flex-1 px-4 py-3 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    uiVersion === 'v2'
                      ? 'bg-accent text-white'
                      : 'bg-background border border-border hover:bg-surface'
                  }`}
                >
                  Version 2
                </button>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunSimulation}
              disabled={!selectedPersonaId || isRunning || isLoadingPersonas}
              className="w-full px-6 py-4 text-base bg-accent hover:bg-accent-light transition-colors rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? '⏸ Running...' : '▶ Start Run'}
            </button>

            <p className="text-xs text-foreground/40 text-center mt-4">
              You will be redirected to the Lab page after completion to view results
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RunPage() {
  return <RunContent />;
}

