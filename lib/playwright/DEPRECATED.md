# DEPRECATED: TypeScript Playwright Implementation

This directory contains the original TypeScript/Node.js implementation of the Playwright UX testing integration.

## Status: DEPRECATED

**This code has been migrated to the Python backend.**

All Playwright orchestration, video recording, event logging, and LLM-driven flows now run in the FastAPI backend at `backend/src/playwright/`.

## Why Deprecated?

1. **Architecture Decision:** The team decided to centralize all backend logic (including browser automation) in Python for consistency with the existing backend stack.

2. **LLM Provider:** Switched from Anthropic Claude to OpenAI GPT-4o, which is already integrated in the backend via `llm_gpt_4o`.

3. **API-First:** The new implementation exposes RESTful endpoints, making it easier for the frontend to trigger runs without managing Node processes.

## Migration

The Python implementation preserves all capabilities:

- ✅ POC 1: Scripted runs with video + events → `backend/src/playwright/gen_z_creator_v1.py`
- ✅ POC 2: LLM-driven runs → `backend/src/playwright/ai_ux_agent_v1.py`
- ✅ Event logging → `backend/src/playwright/logger.py`
- ✅ Video recording → `backend/src/playwright/runner_core.py`
- ✅ Data models → `backend/src/playwright/models.py`
- ✅ REST API → `backend/src/playwright/routes.py`

## Files in This Directory

- `types.ts` - Type definitions (preserved for reference)
- `EventLogger.ts` - Event logger (migrated to `logger.py`)
- `llm-agent.ts` - LLM agent logic (migrated to `llm_agent.py`)
- `adapter.ts` - TKF adapter (preserved for frontend use)

## What to Use Instead

**For backend/server-side work:**
- See `backend/src/playwright/` for the Python implementation
- See `README-PLAYWRIGHT-PYTHON.md` for usage instructions

**For frontend integration:**
- Use the REST API at `http://localhost:8001/playwright/`
- See `README-PLAYWRIGHT-PYTHON.md` for API documentation

## Archival

If you want to fully archive this code:

```bash
mkdir -p archive/typescript-playwright
mv lib/playwright/* archive/typescript-playwright/
mv scripts/playwright archive/typescript-playwright/
mv playwright.config.ts archive/typescript-playwright/
```

## Questions?

See the migration plan: `.cursor/plans/migrate-playwright-to-python-backend_*.plan.md`

