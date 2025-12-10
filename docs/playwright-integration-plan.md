# Playwright Integration with Mimica TKF - Implementation Plan

## Overview

This document describes how to integrate Playwright-recorded runs into Mimica's existing TKF (Task Knowledge Flow) system and lab UI.

## Architecture

```mermaid
flowchart TB
    subgraph playwright [Playwright Runs]
        runData[playwright-runs/run-123/]
        video[video.webm]
        events[events.json]
        metadata[metadata.json]
    end

    subgraph adapter [Adapter Layer]
        loader[loadPlaywrightRun]
        converter[convertEventsToSteps]
    end

    subgraph mimica [Mimica Core]
        simSteps[SimulationStep[]]
        tkfAgg[TKFAggregator]
        insights[TKFInsight[]]
    end

    subgraph ui [Lab UI]
        runSelector[Run Selector Dropdown]
        videoPlayer[Video Player]
        tkfView[TKF View]
        thoughtBubbles[Thought Bubbles]
        scorecard[Scorecard]
    end

    runData --> events
    runData --> metadata
    runData --> video
    
    events --> loader
    metadata --> loader
    loader --> converter
    converter --> simSteps
    simSteps --> tkfAgg
    tkfAgg --> insights
    
    video --> videoPlayer
    insights --> tkfView
    simSteps --> thoughtBubbles
    insights --> scorecard
    
    runSelector --> loader
```

## Phase 1: Backend Integration

### 1.1 Adapter Implementation (✅ Done)

Files created:
- `lib/playwright/adapter.ts` - Converts Playwright data to SimulationSteps
- `lib/playwright/types.ts` - Type definitions

Key functions:
- `loadPlaywrightRun(runId)` - Load events + metadata from disk
- `convertEventsToSteps(events)` - Convert to SimulationStep[]
- `listPlaywrightRuns()` - List all available runs
- `adaptPlaywrightRunForTKF(runId)` - Complete adapter for TKF

### 1.2 Extend SimulationContext (To Do)

Update `lib/simulation/SimulationContext.tsx` to support Playwright runs:

```typescript
// Add new state
const [playwrightRuns, setPlaywrightRuns] = useState<PlaywrightRunMetadata[]>([]);
const [selectedPlaywrightRun, setSelectedPlaywrightRun] = useState<string | null>(null);

// Add new functions
const loadPlaywrightRuns = useCallback(() => {
  const runs = listPlaywrightRuns();
  setPlaywrightRuns(runs);
}, []);

const loadPlaywrightRun = useCallback((runId: string) => {
  const adapted = adaptPlaywrightRunForTKF(runId);
  
  // Feed steps through TKF aggregator
  setAllSteps(adapted.steps);
  adapted.steps.forEach(step => {
    const insight = tkfAggregatorRef.current.processStep(step);
    if (insight) {
      setTkfInsights(tkfAggregatorRef.current.getInsights());
    }
  });
  
  setSelectedPlaywrightRun(runId);
}, []);

// Export in context value
return (
  <SimulationContext.Provider value={{
    ...existingValues,
    playwrightRuns,
    selectedPlaywrightRun,
    loadPlaywrightRuns,
    loadPlaywrightRun,
  }}>
    {children}
  </SimulationContext.Provider>
);
```

## Phase 2: UI Components

### 2.1 Run Selector Component (New)

Create `components/lab/PlaywrightRunSelector.tsx`:

```typescript
interface PlaywrightRunSelectorProps {
  onRunSelect: (runId: string) => void;
}

export function PlaywrightRunSelector({ onRunSelect }: PlaywrightRunSelectorProps) {
  const [runs, setRuns] = useState<PlaywrightRunMetadata[]>([]);
  
  useEffect(() => {
    // Load runs from disk (via API route or direct)
    const loadedRuns = listPlaywrightRuns();
    setRuns(loadedRuns);
  }, []);
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Playwright Runs</label>
      <select
        className="w-full px-3 py-2 border rounded-lg"
        onChange={(e) => onRunSelect(e.target.value)}
      >
        <option value="">Select a run...</option>
        {runs.map((run) => (
          <option key={run.runId} value={run.runId}>
            {run.personaId} - {run.mode} - {new Date(run.startedAt).toLocaleString()}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 2.2 Video Player Component (New)

Create `components/lab/VideoPlayer.tsx`:

```typescript
interface VideoPlayerProps {
  videoPath?: string;
  className?: string;
}

export function VideoPlayer({ videoPath, className }: VideoPlayerProps) {
  if (!videoPath) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-light rounded-lg">
        <p className="text-foreground/60">No video available</p>
      </div>
    );
  }
  
  return (
    <video
      className={className}
      controls
      src={`/playwright-runs/${videoPath}`}
      style={{ width: '100%', maxHeight: '500px' }}
    >
      Your browser does not support video playback.
    </video>
  );
}
```

**Note**: You'll need to configure Next.js to serve files from `playwright-runs/`:

```typescript
// next.config.ts
export default {
  async rewrites() {
    return [
      {
        source: '/playwright-runs/:path*',
        destination: '/api/playwright-runs/:path*',
      },
    ];
  },
};
```

Or create an API route:

```typescript
// app/api/playwright-runs/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = join(process.cwd(), 'playwright-runs', ...params.path);
  
  try {
    const file = readFileSync(filePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'video/webm',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}
```

### 2.3 Update Lab Page (Modify)

Update `app/lab/page.tsx` to include Playwright run support:

```typescript
export default function LabPage() {
  const { 
    loadPlaywrightRun,
    selectedPlaywrightRun,
    // ... existing context values
  } = useSimulation();
  
  const [videoPath, setVideoPath] = useState<string>();
  
  const handleRunSelect = async (runId: string) => {
    // Load run data
    await loadPlaywrightRun(runId);
    
    // Load video path
    const metadata = listPlaywrightRuns().find(r => r.runId === runId);
    setVideoPath(metadata?.videoPath);
  };
  
  return (
    <div className="...">
      {/* Add run selector */}
      <div className="mb-4">
        <PlaywrightRunSelector onRunSelect={handleRunSelect} />
      </div>
      
      {/* Conditional rendering: show video or live app */}
      {selectedPlaywrightRun ? (
        <div className="grid grid-cols-2 gap-4">
          <VideoPlayer videoPath={videoPath} />
          <TKFView />
        </div>
      ) : (
        // Existing embedded app view
        <OnboardingFlow ... />
      )}
      
      {/* Rest of UI */}
      <ThoughtBubble ... />
      <PersonaScorecard ... />
    </div>
  );
}
```

## Phase 3: Enhanced Features (Optional/Stretch)

### 3.1 Synced Playback

Sync video playback with thought bubbles and TKF updates:

```typescript
function SyncedPlayback({ videoPath, steps }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Find current step based on video time
  const currentStep = steps.find(step => {
    const stepTime = (step.timestamp - steps[0].timestamp) / 1000;
    return stepTime <= currentTime && currentTime < stepTime + (step.durationMs || 1000) / 1000;
  });
  
  return (
    <>
      <video
        ref={videoRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        ...
      />
      {currentStep && (
        <ThoughtBubble
          text={currentStep.reasoningText}
          status={currentStep.status}
        />
      )}
    </>
  );
}
```

### 3.2 Run Comparison View

Show side-by-side comparison of two runs:

```typescript
<div className="grid grid-cols-2 gap-4">
  <div>
    <h3>V1 (Before)</h3>
    <VideoPlayer videoPath={v1VideoPath} />
    <TKFView insights={v1Insights} />
  </div>
  <div>
    <h3>V2 (After)</h3>
    <VideoPlayer videoPath={v2VideoPath} />
    <TKFView insights={v2Insights} />
  </div>
</div>
```

### 3.3 Run Analytics Dashboard

Show aggregate statistics across multiple runs:

```typescript
<RunAnalytics>
  <Stat label="Total Runs" value={runs.length} />
  <Stat label="Avg Duration" value={avgDuration} />
  <Stat label="Success Rate" value={successRate} />
  <Chart data={insightsByPersona} />
</RunAnalytics>
```

## Implementation Checklist

### Backend (Required)
- [x] Create adapter types (`lib/playwright/types.ts`)
- [x] Implement adapter functions (`lib/playwright/adapter.ts`)
- [ ] Extend `SimulationContext` to support Playwright runs
- [ ] Add API route for serving video files

### UI Components (Required)
- [ ] Create `PlaywrightRunSelector` component
- [ ] Create `VideoPlayer` component
- [ ] Update `app/lab/page.tsx` to integrate components
- [ ] Style components to match existing Mimica design

### Integration (Required)
- [ ] Test adapter converts events → SimulationSteps correctly
- [ ] Test TKF processes Playwright steps and generates insights
- [ ] Test video playback in browser
- [ ] Verify thought bubbles show Playwright reasoning

### Polish (Optional)
- [ ] Add synced playback (video time → current step)
- [ ] Add run comparison view
- [ ] Add run analytics dashboard
- [ ] Add export/share functionality

## Testing Plan

### Unit Tests
```typescript
describe('Playwright Adapter', () => {
  it('converts PlaywrightEvent to SimulationStep', () => {
    const event: PlaywrightEvent = {
      runId: 'run-123',
      personaId: 'gen-z-creator',
      stepIndex: 0,
      action: 'CLICK',
      targetSelector: '[data-element-id="button"]',
      targetElementId: 'button',
      reasoningText: 'Clicking button',
      status: 'success',
      timestamp: Date.now(),
    };
    
    const step = convertEventToStep(event);
    expect(step.personaId).toBe('gen-z-creator');
    expect(step.action).toBe('CLICK');
  });
});
```

### Integration Tests
1. Run POC 1 to generate test data
2. Load run via adapter
3. Verify TKF generates expected insights
4. Verify video plays in UI

## Demo Flow

For the hackathon demo:

1. **Setup**: Pre-record 2-3 Playwright runs:
   - Gen Z Creator on V1 (scripted)
   - AI UX Agent on V1 (LLM-driven)
   - Gen Z Creator on V2 (scripted)

2. **Demo Script**:
   - Show run selector with available runs
   - Select Gen Z Creator V1 run
   - Play video while showing:
     - Thought bubbles with reasoning
     - TKF insights building in real-time
     - Scorecard showing confusion/friction metrics
   - Switch to AI UX Agent V1 run
   - Highlight LLM-generated reasoning
   - Switch to V2 run to show improvements

3. **Key Points**:
   - "This is a real browser, real clicks"
   - "Reasoning comes from LLM in real-time"
   - "TKF aggregates evidence across personas"
   - "Works with any app, any persona"

## Files to Create/Modify

### New Files
- `lib/playwright/adapter.ts` (✅ created)
- `lib/playwright/types.ts` (✅ created)
- `components/lab/PlaywrightRunSelector.tsx`
- `components/lab/VideoPlayer.tsx`
- `app/api/playwright-runs/[...path]/route.ts`

### Modified Files
- `lib/simulation/SimulationContext.tsx` - Add Playwright support
- `app/lab/page.tsx` - Integrate Playwright UI components
- `next.config.ts` - Configure static file serving (if needed)

## Success Criteria

Integration is successful when:
- ✅ Adapter converts Playwright events to SimulationSteps
- ✅ TKF processes Playwright steps and generates insights
- ✅ UI displays list of available Playwright runs
- ✅ Video plays smoothly in lab UI
- ✅ Thought bubbles show Playwright/LLM reasoning
- ✅ Scorecard reflects Playwright run metrics
- ✅ Demo flow is smooth and impressive

## Next Steps After Integration

1. **Test with Real Personas**: Run all 4 personas (3 human + 1 AI) through both UI versions
2. **Gather Metrics**: Compare V1 vs V2 metrics to validate improvements
3. **Iterate on Prompts**: Refine LLM prompts based on reasoning quality
4. **MCP Wrapper** (Stretch): Wrap orchestrator as MCP tool for Cursor integration
5. **Production Deploy**: Add run storage, user auth, sharing features

