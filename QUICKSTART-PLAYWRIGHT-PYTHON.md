# Quick Start: Playwright Python Backend

Get the Playwright UX testing integration running in 5 minutes.

## Prerequisites

- Python 3.13+
- Node.js 18+
- OpenAI API key (GPT-4o)

## Step 1: Setup Backend (2 minutes)

```bash
cd backend

# Install dependencies
uv sync
# or: pip install -e .

# Install Playwright browsers
uv run playwright install chromium
# or: python3 -m playwright install chromium

# Create .env file (or use your existing one)
# The backend supports both OPENAI_API_KEY and OPENAI_API_KEY_GPT_4O
cat > .env << EOF
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o
APP_BASE_URL=http://localhost:3000
PLAYWRIGHT_OUTPUT_DIR=playwright-runs
EOF
```

## Step 2: Start Backend (30 seconds)

```bash
cd backend
uv run python -m src.main
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

Visit `http://localhost:8001/docs` to see the API documentation.

## Step 3: Test Backend (1 minute)

In a new terminal:

```bash
# Health check
curl http://localhost:8001/health

# Start a scripted run
curl -X POST http://localhost:8001/playwright/runs \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": "gen-z-creator",
    "scenario_id": "onboarding",
    "ui_version": "v1",
    "mode": "scripted",
    "headless": true
  }'

# You'll get a run_id back. Wait ~30 seconds, then:
curl http://localhost:8001/playwright/runs

# You should see your completed run listed
```

## Step 4: Start Frontend (1 minute)

In a new terminal:

```bash
# Create .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8001" >> .env.local

# Start Next.js
npm run dev
```

Visit `http://localhost:3000`.

## Step 5: View Results (30 seconds)

```bash
# List runs to get a run_id
curl http://localhost:8001/playwright/runs

# Download video
curl http://localhost:8001/playwright/runs/run-{timestamp}/video -o video.webm

# Open video
open video.webm  # macOS
# or: xdg-open video.webm  # Linux
# or: start video.webm  # Windows
```

## What You Just Did

✅ Set up Python backend with Playwright  
✅ Started FastAPI server with UX testing endpoints  
✅ Ran a scripted persona (Gen Z Creator) through V1 UI  
✅ Generated video + events + metadata  
✅ Connected frontend to backend  

## Next Steps

### Run an LLM-Driven Persona

```bash
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

### Run from Command Line

```bash
cd backend

# Scripted
python -m src.playwright.gen_z_creator_v1

# LLM-driven
python -m src.playwright.ai_ux_agent_v1
```

### Integrate with Frontend

See `INTEGRATION-EXAMPLE.md` for:
- React component examples
- API client usage
- Video playback
- TKF integration

## Troubleshooting

### "playwright: command not found"

```bash
pip install playwright
playwright install chromium
```

### "OPENAI_API_KEY_GPT_4O or OPENAI_API_KEY must be set"

Add your OpenAI API key to `backend/.env`:

```bash
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o
```

### "Port 8001 already in use"

Change the port in `backend/src/main.py`:

```python
uvicorn.run(app, host="0.0.0.0", port=8002)
```

### Video file not found

Wait a bit longer - video encoding happens after the run completes.

### CORS errors

Update `backend/src/main.py` to allow your frontend port:

```python
allow_origins=["http://localhost:3000", "http://localhost:3001"],
```

## Documentation

- **Full Guide:** `README-PLAYWRIGHT-PYTHON.md`
- **Frontend Integration:** `INTEGRATION-EXAMPLE.md`
- **Migration Details:** `MIGRATION-SUMMARY.md`
- **API Docs:** `http://localhost:8001/docs` (when backend is running)

## What's Available

### Personas

1. **gen-z-creator** (scripted)
   - Young content creator
   - Tests V1 UI with confusion points
   - ~12 steps, 30-45 seconds

2. **ai-ux-agent** (LLM-driven)
   - AI-powered UX tester
   - Makes real-time decisions with GPT-4o
   - Variable steps (max 20), 1-2 minutes

### Outputs

Each run produces:
- `video.webm` - Full session recording
- `trace.zip` - Playwright trace for debugging
- `events.json` - Event log with reasoning
- `metadata.json` - Run metadata

## Success!

You now have a working Playwright + GPT-4o UX testing system. 🎉

Next: Integrate with your frontend UI and feed events into the TKF system.

