# Playwright Python Backend Integration

## Overview

The Playwright UX testing integration has been migrated to the **Python FastAPI backend**. All Playwright orchestration, video recording, event logging, and LLM-driven persona flows now run server-side.

### Architecture

```
Frontend (Next.js) 
    ↓ HTTP API
FastAPI Backend (Python)
    ↓
Playwright Python Runner
    ↓
Chromium Browser → Video + Events + Trace
    ↓
GPT-4o-mini (plan-then-execute for LLM personas)
```

### LLM Strategy: Plan-Then-Execute ⚡

The LLM-driven runs now use a **plan-then-execute** architecture for dramatically better performance:

- **LLM calls**: Once per screen (4-5 total) instead of once per action (15-20)
- **Speed**: 40-60 seconds instead of 3-6 minutes (**4-7x faster**)
- **Reasoning**: Fully preserved - each planned action includes reasoning for TKF
- **Execution**: Actions execute at full Playwright speed after planning

See `PLAN-THEN-EXECUTE-SUMMARY.md` for detailed architecture explanation.

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Install dependencies
uv sync
# or: pip install -e .

# Install Playwright browsers
uv run playwright install chromium
# or: python3 -m playwright install chromium

# Set environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY_GPT_4O
```

### 2. Start Backend

```bash
cd backend
python -m src.main
```

The API will be available at `http://localhost:8001`.

### 3. Start Frontend

```bash
# In a separate terminal
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## API Endpoints

### Start a Run

```bash
# Scripted run (Gen Z Creator on V1)
curl -X POST http://localhost:8001/playwright/runs \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": "gen-z-creator",
    "scenario_id": "onboarding",
    "ui_version": "v1",
    "mode": "scripted",
    "headless": true
  }'

# LLM-driven run (AI UX Agent on V1)
curl -X POST http://localhost:8001/playwright/runs \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": "ai-ux-agent",
    "scenario_id": "onboarding",
    "ui_version": "v1",
    "mode": "llm-driven",
    "headless": true,
    "max_steps": 20
  }'
```

### List All Runs

```bash
curl http://localhost:8001/playwright/runs
```

### Get Run Metadata

```bash
curl http://localhost:8001/playwright/runs/{run_id}
```

### Get Run Events

```bash
curl http://localhost:8001/playwright/runs/{run_id}/events
```

### Download Video

```bash
curl http://localhost:8001/playwright/runs/{run_id}/video -o video.webm
```

### Download Trace

```bash
curl http://localhost:8001/playwright/runs/{run_id}/trace -o trace.zip
```

### Delete Run

```bash
curl -X DELETE http://localhost:8001/playwright/runs/{run_id}
```

## Output Structure

Each run creates a directory under `playwright-runs/`:

```
playwright-runs/
└── run-1234567890/
    ├── video.webm       # Full session recording
    ├── trace.zip        # Playwright trace (for debugging)
    ├── events.json      # Event log with reasoning
    └── metadata.json    # Run metadata
```

## Available Personas

### 1. Gen Z Creator (Scripted)
- **ID:** `gen-z-creator`
- **Mode:** `scripted`
- **Description:** Young content creator testing the V1 UI with confusion points
- **Use case:** Demonstrates problematic UI with scripted confusion/blocks

### 2. AI UX Agent (LLM-Driven, Plan-Then-Execute)
- **ID:** `ai-ux-agent`
- **Mode:** `llm-driven`
- **Description:** AI agent that identifies usability issues using plan-then-execute
- **Use case:** Demonstrates fast LLM-powered UX testing with GPT-4o-mini
- **Architecture:** Plans per screen, then executes actions at Playwright speed (4-7x faster)

## Running from Command Line

You can also run personas directly from the backend:

```bash
cd backend

# Run scripted Gen Z Creator
python -m src.playwright.gen_z_creator_v1

# Run LLM-driven AI UX Agent (plan-then-execute, default)
python -m src.playwright.ai_ux_agent_v1_plan

# Run LLM-driven AI UX Agent (legacy per-step)
python -m src.playwright.ai_ux_agent_v1
```

## Integration with Frontend

The frontend can call the backend API to:

1. **Trigger runs** via `POST /playwright/runs`
2. **Poll for completion** via `GET /playwright/runs/{run_id}`
3. **Fetch events** via `GET /playwright/runs/{run_id}/events`
4. **Display video** via `GET /playwright/runs/{run_id}/video`

Example frontend integration:

```typescript
// Start a run
const response = await fetch('http://localhost:8001/playwright/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    persona_id: 'gen-z-creator',
    scenario_id: 'onboarding',
    ui_version: 'v1',
    mode: 'scripted',
    headless: true
  })
});

const { run_id } = await response.json();

// Poll for completion
const pollStatus = async () => {
  const statusResponse = await fetch(`http://localhost:8001/playwright/runs/${run_id}`);
  const metadata = await statusResponse.json();
  
  if (metadata.status === 'completed' || metadata.status === 'failed') {
    // Run finished
    return metadata;
  }
  
  // Still running, poll again
  setTimeout(pollStatus, 2000);
};

// Get events
const eventsResponse = await fetch(`http://localhost:8001/playwright/runs/${run_id}/events`);
const { events } = await eventsResponse.json();

// Show video
const videoUrl = `http://localhost:8001/playwright/runs/${run_id}/video`;
```

## Configuration

Environment variables in `backend/.env`:

```bash
# Required (use existing variable names or GPT_4O variants)
OPENAI_API_KEY=sk-...
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o

# Optional
APP_BASE_URL=http://localhost:3000
PLAYWRIGHT_OUTPUT_DIR=playwright-runs

# Optional (for tracing)
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

**Note:** The backend supports both `OPENAI_API_KEY` and `OPENAI_API_KEY_GPT_4O` (and corresponding `_ENDPOINT` variants). The code will use your existing environment variables.

## Differences from TypeScript Version

| Feature | TypeScript (Node) | Python (Backend) |
|---------|-------------------|------------------|
| LLM Provider | Anthropic Claude | OpenAI GPT-4o |
| Test Runner | @playwright/test | Custom async runner |
| API | CLI scripts | FastAPI REST endpoints |
| Video Management | Automatic by test runner | Manual path tracking |
| Trace | Automatic by test runner | Manual start/stop |
| Background Execution | No | Yes (FastAPI BackgroundTasks) |

## Troubleshooting

### Browser not found
```bash
playwright install chromium
```

### Port 8001 already in use
```bash
# Change port in backend/src/main.py
uvicorn.run(app, host="0.0.0.0", port=8002)
```

### CORS errors from frontend
The backend allows `http://localhost:3000` by default. If using a different frontend port, update the CORS settings in `backend/src/main.py`.

### Video file not found
Videos are saved asynchronously when the context closes. Make sure to call `await runner.stop()` and check that the video file exists before serving it.

## Migration Notes

The original TypeScript Playwright implementation (`lib/playwright/`, `scripts/playwright/`) has been preserved for reference but is now **deprecated**. All new development should use the Python backend.

To archive the old code:
```bash
mkdir archive
mv lib/playwright archive/
mv scripts/playwright archive/
mv playwright.config.ts archive/
```

## Documentation

- **Planning Strategies Comparison:** `PLANNING-STRATEGIES-COMPARISON.md` 🚀 NEW - Compare 3 strategies
- **Plan-Then-Execute:** `PLAN-THEN-EXECUTE-SUMMARY.md` ⚡ Per-screen details
- **Backend README:** `backend/README.md`
- **API Docs:** `http://localhost:8001/docs` (when backend is running)
- **Implementation Summary:** `docs/playwright-implementation-summary.md`
- **Original TS Implementation:** `README-PLAYWRIGHT.md` (deprecated)

## Next Steps

1. **UI Integration:** Add UI components in the lab to trigger runs and display results
2. **TKF Integration:** Feed Playwright events into the TKF aggregator
3. **Parallel Runs:** Support running multiple personas concurrently
4. **More Personas:** Add more scripted and LLM-driven personas
5. **Cursor Integration:** Explore direct Cursor API integration for applying changes

See `MIMICA_HACKATHON_PLAN.md` for the full roadmap.

