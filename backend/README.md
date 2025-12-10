# Mimica Backend

FastAPI backend for the Mimica UX testing platform, including Playwright-based browser automation with AI-driven personas.

## Setup

### 1. Install Dependencies

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -e .
```

### 2. Install Playwright Browsers

```bash
# Install Chromium browser for Playwright
uv run playwright install chromium
# or: python3 -m playwright install chromium
```

### 3. Environment Variables

Create a `.env` file in the backend directory:

```bash
# OpenAI Configuration (use existing variables or GPT_4O variants)
OPENAI_API_KEY=sk-...
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o

# Langfuse (optional, for tracing)
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Playwright Configuration (optional)
APP_BASE_URL=http://localhost:3000
PLAYWRIGHT_OUTPUT_DIR=playwright-runs
```

**Note:** The backend supports both `OPENAI_API_KEY` and `OPENAI_API_KEY_GPT_4O`. Use whichever matches your existing setup.

## Running the Backend

### Development Server

```bash
cd backend
python -m src.main
```

The API will be available at `http://localhost:8001`.

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Playwright Integration

The backend provides Playwright-based browser automation for UX testing with real browsers.

### Features

- **Real browser testing** with Chromium
- **Video recording** of entire user flows
- **Event logging** with reasoning text
- **LLM-driven agents** using GPT-4o
- **Scripted flows** for deterministic testing

### Testing a Flow

#### Via API:

```bash
# Start a scripted run
curl -X POST http://localhost:8000/playwright/runs \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": "gen-z-creator",
    "scenario_id": "onboarding",
    "ui_version": "v1",
    "mode": "scripted"
  }'

# Get run status
curl http://localhost:8001/playwright/runs/{run_id}

# Get events
curl http://localhost:8001/playwright/runs/{run_id}/events

# Download video
curl http://localhost:8001/playwright/runs/{run_id}/video -o video.webm
```

### Output Structure

Each run creates a directory:

```
playwright-runs/
└── run-{uuid}/
    ├── video.webm       # Full session recording
    ├── trace.zip        # Playwright trace
    ├── events.json      # Event log with reasoning
    └── metadata.json    # Run metadata
```

## Architecture

```
Frontend (Next.js) 
    ↓ HTTP
FastAPI Backend
    ↓
Playwright Python Runner
    ↓
Chromium Browser → Video + Events
    ↓
GPT-4o (for LLM-driven personas)
```

## Development

### Running Debug Agent

```bash
cd backend
python -m src.debug
```

This starts an interactive chat loop with the debug agent using GPT-4o.

