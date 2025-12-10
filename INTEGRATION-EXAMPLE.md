# Frontend Integration Example

This document shows how to integrate the Python Playwright backend with the Next.js frontend.

## API Client

The API client is available at `lib/api/playwright.ts`. It provides functions for:

- Starting runs
- Polling for completion
- Fetching metadata and events
- Getting video/trace URLs
- Deleting runs

## Example: Trigger a Run from the Lab UI

```typescript
import { useState } from 'react';
import {
  startPlaywrightRun,
  pollPlaywrightRunCompletion,
  getPlaywrightRunEvents,
  getPlaywrightRunVideoUrl,
  type RunMetadata,
  type PlaywrightEvent,
} from '@/lib/api/playwright';

export function PlaywrightRunButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<{
    metadata: RunMetadata;
    events: PlaywrightEvent[];
  } | null>(null);

  const handleRunGenZCreator = async () => {
    setIsRunning(true);
    setProgress('Starting run...');

    try {
      // Start the run
      const { run_id } = await startPlaywrightRun({
        persona_id: 'gen-z-creator',
        scenario_id: 'onboarding',
        ui_version: 'v1',
        mode: 'scripted',
        headless: true,
      });

      setProgress(`Run started: ${run_id}. Waiting for completion...`);

      // Poll for completion
      const metadata = await pollPlaywrightRunCompletion(
        run_id,
        (meta) => {
          setProgress(`Status: ${meta.status} (${meta.duration_ms}ms)`);
        }
      );

      // Get events
      const events = await getPlaywrightRunEvents(run_id);

      setResult({ metadata, events });
      setProgress('Run completed!');
    } catch (error) {
      console.error('Run failed:', error);
      setProgress(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleRunGenZCreator}
        disabled={isRunning}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Run Gen Z Creator (V1)'}
      </button>

      {progress && (
        <div className="text-sm text-gray-600">{progress}</div>
      )}

      {result && (
        <div className="space-y-2">
          <h3 className="font-semibold">Results</h3>
          <div>
            <strong>Run ID:</strong> {result.metadata.run_id}
          </div>
          <div>
            <strong>Duration:</strong> {result.metadata.duration_ms}ms
          </div>
          <div>
            <strong>Events:</strong> {result.events.length}
          </div>
          
          {result.metadata.video_path && (
            <div>
              <strong>Video:</strong>{' '}
              <a
                href={getPlaywrightRunVideoUrl(result.metadata.run_id)}
                target="_blank"
                className="text-blue-600 underline"
              >
                Download
              </a>
            </div>
          )}

          <details>
            <summary className="cursor-pointer">Events</summary>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(result.events, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
```

## Example: Using with Helper Function

```typescript
import { startAndWaitForPlaywrightRun } from '@/lib/api/playwright';

async function runAIUXAgent() {
  const { metadata, events } = await startAndWaitForPlaywrightRun(
    {
      persona_id: 'ai-ux-agent',
      scenario_id: 'onboarding',
      ui_version: 'v1',
      mode: 'llm-driven',
      headless: true,
      max_steps: 20,
    },
    (progress) => {
      console.log('Progress:', progress.status);
    }
  );

  console.log('Run complete!', metadata);
  console.log('Events:', events);
  
  // Feed events to TKF
  events.forEach(event => {
    tkfAggregator.processStep(convertEventToSimulationStep(event));
  });
}
```

## Example: Listing Past Runs

```typescript
import { listPlaywrightRuns } from '@/lib/api/playwright';

export function PlaywrightRunHistory() {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    async function loadRuns() {
      const allRuns = await listPlaywrightRuns();
      setRuns(allRuns);
    }
    loadRuns();
  }, []);

  return (
    <div>
      <h3>Past Runs</h3>
      <ul>
        {runs.map(run => (
          <li key={run.run_id}>
            {run.persona_id} - {run.status} ({run.duration_ms}ms)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Example: Displaying Video

```typescript
import { getPlaywrightRunVideoUrl } from '@/lib/api/playwright';

export function PlaywrightVideoPlayer({ runId }: { runId: string }) {
  const videoUrl = getPlaywrightRunVideoUrl(runId);

  return (
    <video controls className="w-full max-w-4xl">
      <source src={videoUrl} type="video/webm" />
      Your browser does not support the video tag.
    </video>
  );
}
```

## Integration with TKF

To feed Playwright events into the TKF system, you can use the existing adapter:

```typescript
import { adaptPlaywrightEventsToSimulationSteps } from '@/lib/playwright/adapter';
import { getPlaywrightRunEvents, getPlaywrightRunMetadata } from '@/lib/api/playwright';

async function feedPlaywrightRunToTKF(runId: string) {
  // Get events and metadata
  const events = await getPlaywrightRunEvents(runId);
  const metadata = await getPlaywrightRunMetadata(runId);

  // Convert to SimulationSteps
  const steps = adaptPlaywrightEventsToSimulationSteps(events, metadata);

  // Feed to TKF aggregator
  steps.forEach(step => {
    tkfAggregator.processStep(step);
  });

  // Get insights
  const insights = tkfAggregator.getInsights();
  return insights;
}
```

## Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

## CORS Configuration

The backend is already configured to allow requests from `http://localhost:3000`. If you use a different port, update `backend/src/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Next Steps

1. Add a UI component in the lab to trigger Playwright runs
2. Display run progress with a progress bar
3. Show video playback synchronized with events
4. Feed events into TKF for analysis
5. Display TKF insights alongside video playback

