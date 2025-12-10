# Scripted Persona Suite - Quick Start

## Overview

JSON-driven scripted Playwright flows for all 5 personas, producing reliable demo videos and events for the hackathon.

## The 5 Personas

1. **Impatient New User** (`impatient_new_user`) - Rushes through, skips text, gets frustrated
2. **Methodical Evaluator** (`methodical_evaluator`) - Reads everything, compares options, questions vague language
3. **Power User Explorer** (`power_user_explorer`) - Tries alternative paths, experiments, tests edge cases
4. **Privacy Skeptic** (`privacy_skeptic`) - Carefully reads privacy-related copy, chooses most private options
5. **Accessibility Screen Reader** (`accessibility_screen_reader`) - Keyboard navigation, checks for labels and focus management

## Quick Start

### Prerequisites

```bash
cd backend
uv sync
uv run playwright install chromium
```

### Run All Personas (V1 UI)

```bash
# CLI
cd backend
uv run python -m src.playwright.batch_runner v1

# API
curl -X POST http://localhost:8001/playwright/scripted-suite \
  -H "Content-Type: application/json" \
  -d '{"ui_version": "v1", "headless": true}'
```

### Run Specific Personas

```bash
# CLI - Just 2 personas
uv run python -m src.playwright.batch_runner v1 impatient_new_user privacy_skeptic

# API
curl -X POST http://localhost:8001/playwright/scripted-suite \
  -H "Content-Type: application/json" \
  -d '{
    "ui_version": "v1",
    "persona_ids": ["impatient_new_user", "privacy_skeptic"],
    "headless": true
  }'
```

### Run Single Persona

```bash
uv run python -m src.playwright.scripted_runner impatient_new_user v1
```

## Outputs

Each persona run creates:

```
backend/playwright-runs/
└── run-impatient_new_user-1234567890/
    ├── video.webm       # Full session recording
    ├── trace.zip        # Playwright trace
    ├── events.json      # Event log with reasoning
    └── metadata.json    # Run metadata (includes run_group_id)
```

## Run Grouping

All personas in a suite share a `run_group_id` for easy batch analysis:

```json
{
  "run_id": "run-impatient_new_user-1234567890",
  "persona_id": "impatient_new_user",
  "run_group_id": "suite-v1-1234567890",
  ...
}
```

### Check Suite Status

```bash
# API
curl http://localhost:8001/playwright/scripted-suite/{run_group_id}
```

Response:
```json
{
  "run_group_id": "suite-v1-1234567890",
  "status": "completed",
  "total_personas": 5,
  "completed": 5,
  "failed": 0,
  "runs": [
    {"run_id": "...", "persona_id": "impatient_new_user", "status": "completed"},
    ...
  ]
}
```

## File Structure

```
backend/
├── playwright-scripts/
│   ├── v1/
│   │   ├── impatient_new_user.json
│   │   ├── methodical_evaluator.json
│   │   ├── power_user_explorer.json
│   │   ├── privacy_skeptic.json
│   │   └── accessibility_screen_reader.json
│   └── v2/
│       └── (to be created after V2 UI is ready)
│
├── src/playwright/
│   ├── script_models.py      # Pydantic models for JSON validation
│   ├── scripted_runner.py    # Single persona runner
│   ├── batch_runner.py        # Multi-persona suite runner
│   └── routes.py              # FastAPI endpoints
│
└── playwright-runs/           # Output directory
    └── run-{persona}-{timestamp}/
        ├── video.webm
        ├── trace.zip
        ├── events.json
        └── metadata.json
```

## For V2 UI (Later)

When V2 UI is ready:

1. **Copy V1 scripts** to `playwright-scripts/v2/`
2. **Update selectors** in the JSON files if element IDs changed
3. **Update reasoning** to reflect V2 improvements
4. **Run the suite**:
   ```bash
   uv run python -m src.playwright.batch_runner v2
   ```

## JSON Script Format

Each persona script follows this schema:

```json
{
  "persona_id": "impatient_new_user",
  "persona_name": "Impatient First-Time User",
  "ui_version": "v1",
  "scenario_id": "onboarding",
  "description": "Brief description",
  "steps": [
    {
      "screen_id": "step-0",
      "action": "CLICK",
      "selector": "[data-element-id='goal-option-maximize']",
      "value": null,
      "reasoning": "First-person thought for TKF bubbles",
      "status": "success",
      "wait_before_ms": 0,
      "wait_after_ms": 500
    }
  ]
}
```

See `SCRIPTED-FLOWS-SCHEMA.md` for full documentation.

## Demo Workflow

### Step 1: Generate V1 Videos (Before Demo)

```bash
cd backend
uv run python -m src.playwright.batch_runner v1 --headless
```

This creates 5 videos + events for V1 UI. Note the `run_group_id` from output.

### Step 2: Show in Demo UI

Use the `run_group_id` to load all 5 persona runs in the frontend:

```typescript
const runs = await fetch(`/playwright/scripted-suite/${runGroupId}`);
// Display videos and TKF insights for all 5 personas
```

### Step 3: Make V2 Changes

Update the onboarding UI based on insights.

### Step 4: Generate V2 Videos

```bash
# After updating scripts for V2
uv run python -m src.playwright.batch_runner v2 --headless
```

### Step 5: Compare V1 vs V2

Show side-by-side comparison of TKF insights and metrics.

## Troubleshooting

### Script Not Found

```
FileNotFoundError: Script not found: playwright-scripts/v1/impatient_new_user.json
```

**Fix**: Ensure you're running from `backend/` directory or scripts exist in `backend/playwright-scripts/v1/`

### Validation Error

```
ValidationError: Invalid script format
```

**Fix**: Check JSON syntax and ensure all required fields are present. See `SCRIPTED-FLOWS-SCHEMA.md`.

### Element Not Found

```
✗ Failed: Timeout waiting for selector
```

**Fix**: Update selector in JSON script if UI changed, or check that app is running on correct URL.

**Note**: Scripts navigate to `/app?version=v1` (not `/lab`) to record only the onboarding UI without lab controls.

## API Reference

### POST /playwright/scripted-suite

Start a suite run.

**Request**:
```json
{
  "ui_version": "v1",
  "persona_ids": ["impatient_new_user", "methodical_evaluator"],
  "run_group_id": "optional-custom-id",
  "headless": true
}
```

**Response**:
```json
{
  "run_group_id": "suite-v1-1234567890",
  "ui_version": "v1",
  "persona_count": 2,
  "message": "Started scripted suite for 2 personas"
}
```

### GET /playwright/scripted-suite/{run_group_id}

Get suite status.

**Response**:
```json
{
  "run_group_id": "suite-v1-1234567890",
  "status": "completed",
  "total_personas": 5,
  "completed": 5,
  "failed": 0,
  "running": 0,
  "runs": [...]
}
```

## Next Steps

- ✅ All 5 V1 persona scripts created
- ✅ Batch runner implemented
- ✅ API endpoints ready
- ⏳ Run suite to generate demo videos
- ⏳ Integrate with frontend for display
- ⏳ Create V2 scripts after UI improvements
- ⏳ Generate V2 videos for comparison

## Documentation

- **Schema**: `SCRIPTED-FLOWS-SCHEMA.md`
- **Personas**: `PERSONAS-REFERENCE.md`
- **Implementation**: See plan in `.cursor/plans/scripted-persona-suite_*.plan.md`

