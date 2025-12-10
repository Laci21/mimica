'use client';

import { SimulationProvider, useSimulation } from '@/lib/simulation/SimulationContext';
import { personas as frontendPersonas } from '@/lib/data/personas';
import { scenarios } from '@/lib/data/scenarios';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startPlaywrightRun, pollPlaywrightRunCompletion } from '@/lib/api/playwright';

interface CombinedPersona {
  id: string;
  name: string;
  description: string;
  source: 'frontend' | 'backend';
}

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
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('complete-onboarding');
  const [speed, setSpeed] = useState<number>(1.5);
  const [uiVersion, setUiVersion] = useState<'v1' | 'v2'>('v1');
  const [combinedPersonas, setCombinedPersonas] = useState<CombinedPersona[]>([]);
  const [backendRunProgress, setBackendRunProgress] = useState<string>('');
  const [isBackendRunning, setIsBackendRunning] = useState(false);
  const router = useRouter();

  const { isRunning, startSimulation, allSteps } = useSimulation();

  // Fetch and combine personas on mount
  useEffect(() => {
    const fetchBackendPersonas = async () => {
      try {
        const response = await fetch('http://localhost:8001/persona');
        if (response.ok) {
          const backendPersonasData: BackendPersona[] = await response.json();
          
          // Convert backend personas to combined format
          const backendCombined: CombinedPersona[] = backendPersonasData.map((p) => ({
            id: p.id,
            name: p.displayName,
            description: p.description,
            source: 'backend' as const,
          }));
          
          // Convert frontend personas to combined format
          const frontendCombined: CombinedPersona[] = frontendPersonas.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            source: 'frontend' as const,
          }));
          
          // Combine both lists
          setCombinedPersonas([...frontendCombined, ...backendCombined]);
        } else {
          // Backend unavailable, use only frontend personas
          const frontendCombined: CombinedPersona[] = frontendPersonas.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            source: 'frontend' as const,
          }));
          setCombinedPersonas(frontendCombined);
        }
      } catch (error) {
        console.error('Failed to fetch backend personas:', error);
        // Fallback to frontend personas only
        const frontendCombined: CombinedPersona[] = frontendPersonas.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          source: 'frontend' as const,
        }));
        setCombinedPersonas(frontendCombined);
      }
    };

    fetchBackendPersonas();
  }, []);

  const handleRunSimulation = async () => {
    if (!selectedPersonaId) return;
    
    // Find the selected persona to determine its source
    const selectedPersona = combinedPersonas.find(p => p.id === selectedPersonaId);
    if (!selectedPersona) return;
    
    if (selectedPersona.source === 'frontend') {
      // Use existing frontend simulation
      startSimulation(selectedPersonaId, selectedScenarioId, uiVersion, speed);
    } else {
      // Use backend Playwright API for backend personas
      try {
        setIsBackendRunning(true);
        setBackendRunProgress('Starting run...');
        
        const response = await startPlaywrightRun({
          persona_id: selectedPersonaId,
          scenario_id: selectedScenarioId,
          ui_version: uiVersion,
          mode: 'llm-driven',
          headless: false,
        });
        
        setBackendRunProgress('Running...');
        
        // Poll for completion
        await pollPlaywrightRunCompletion(response.run_id, (metadata) => {
          const eventCount = metadata.metadata?.eventCount || 0;
          setBackendRunProgress(`Running... ${eventCount} events`);
        });
        
        setBackendRunProgress('Complete!');
        
        // Redirect to lab after short delay
        setTimeout(() => {
          router.push('/lab');
        }, 1000);
      } catch (error) {
        console.error('Backend run failed:', error);
        setBackendRunProgress(`Error: ${error instanceof Error ? error.message : 'Run failed'}`);
        setIsBackendRunning(false);
      }
    }
  };

  // Redirect to lab page when frontend simulation completes
  useEffect(() => {
    if (!isRunning && allSteps.length > 0) {
      // Small delay to ensure data is ready
      setTimeout(() => {
        router.push('/lab');
      }, 500);
    }
  }, [isRunning, allSteps.length, router]);
  
  const isAnyRunning = isRunning || isBackendRunning;

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
            {/* Status Display */}
            {isRunning && (
              <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-accent text-2xl">⏳</div>
                  <div>
                    <p className="text-sm font-medium text-accent">Frontend Simulation Running...</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {allSteps.length} steps completed
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {isBackendRunning && (
              <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-purple-400 text-2xl">⏳</div>
                  <div>
                    <p className="text-sm font-medium text-purple-400">LLM Run in Progress...</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {backendRunProgress}
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
                disabled={isAnyRunning}
                className="w-full px-4 py-3 text-sm bg-background border border-border rounded-lg disabled:opacity-50 focus:border-accent focus:outline-none"
              >
                <option value="">Choose a persona...</option>
                {combinedPersonas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} [{persona.source === 'frontend' ? 'Scripted' : 'LLM'}] - {persona.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Scenario Selector - Hidden for now (only one scenario) */}
            {/* TODO: Re-enable when multiple scenarios are available */}

            {/* UI Version Selector */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground/90 block mb-2">
                UI Version
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setUiVersion('v1')}
                  disabled={isAnyRunning}
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
                  disabled={isAnyRunning}
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

            {/* Speed Control */}
            <div className="mb-8">
              <label className="text-sm font-medium text-foreground/90 block mb-2">
                Simulation Speed: {speed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                disabled={isAnyRunning}
                className="w-full disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-foreground/50 mt-1">
                <span>0.5x (Slow)</span>
                <span>1.5x (Normal)</span>
                <span>3x (Fast)</span>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunSimulation}
              disabled={!selectedPersonaId || isAnyRunning}
              className="w-full px-6 py-4 text-base bg-accent hover:bg-accent-light transition-colors rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnyRunning ? '⏸ Running...' : '▶ Start Simulation'}
            </button>

            <p className="text-xs text-foreground/40 text-center mt-4">
              Results will be available in the Lab page after completion
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RunPage() {
  return (
    <SimulationProvider>
      <RunContent />
    </SimulationProvider>
  );
}

