# ⚠️ DEPRECATED: Playwright MCP UX Agent Integration (TypeScript)

**This TypeScript/Node.js implementation has been migrated to the Python backend.**

**👉 For the current implementation, see [README-PLAYWRIGHT-PYTHON.md](./README-PLAYWRIGHT-PYTHON.md)**

---

This README provides a quick overview of the **original** Playwright integration for AI/UX agent persona testing (now deprecated).

## 📚 Documentation Index

All documentation is in the `docs/` folder:

1. **[playwright-implementation-summary.md](./docs/playwright-implementation-summary.md)** 
   - **START HERE** - Executive summary of what was built
   - File structure overview
   - Success metrics
   - Demo plan

2. **[playwright-poc1-readme.md](./docs/playwright-poc1-readme.md)**
   - POC 1: Scripted runs setup & usage
   - Installation instructions
   - Output format documentation

3. **[playwright-poc2-readme.md](./docs/playwright-poc2-readme.md)**
   - POC 2: LLM-driven runs setup & usage
   - Anthropic API key setup
   - How LLM decision-making works

4. **[playwright-integration-plan.md](./docs/playwright-integration-plan.md)**
   - Integration with Mimica TKF system
   - UI components design
   - Implementation checklist

5. **[playwright-recording-research.md](./docs/playwright-recording-research.md)**
   - Research: Video/trace recording capabilities
   - Technical deep dive

6. **[playwright-mcp-research.md](./docs/playwright-mcp-research.md)**
   - Research: MCP server integration patterns
   - LLM integration architecture

## 🚀 Quick Start

### POC 1: Scripted Run (5 minutes)

```bash
# 1. Install
npm install
npm run playwright:install

# 2. Start app
npm run dev

# 3. Run test (in new terminal)
npm run playwright:gen-z-v1

# 4. View results
open playwright-runs/run-*/video.webm
```

### POC 2: LLM-Driven Run (10 minutes)

```bash
# 1. Get Anthropic API key from https://console.anthropic.com/

# 2. Set key
export ANTHROPIC_API_KEY="sk-ant-your-key-here"

# 3. Start app
npm run dev

# 4. Run test (in new terminal)
npm run playwright:ai-agent-v1

# 5. View results
open playwright-runs/run-llm-*/video.webm
```

## 📁 What Was Built

### Core Files

```
lib/playwright/
├── types.ts           # Type definitions
├── EventLogger.ts     # Event logging utility
├── llm-agent.ts       # LLM decision-making
└── adapter.ts         # TKF integration adapter

scripts/playwright/
├── gen-z-creator-v1.spec.ts   # POC 1 test
└── ai-ux-agent-v1.spec.ts     # POC 2 test

playwright.config.ts   # Playwright configuration
```

### Output Format

Each run produces:

```
playwright-runs/run-123456789/
├── video.webm         # Full video recording
├── events.json        # Structured event log
└── metadata.json      # Run metadata
```

## 🎯 Key Features

- ✅ **Real browser testing** via Playwright
- ✅ **Video + trace recording** of entire flow
- ✅ **Event logging** with reasoning text
- ✅ **LLM-driven decisions** (POC 2) using Claude
- ✅ **TKF integration** via adapter layer
- ✅ **Persona-driven** flows matching existing system

## 🎬 Demo Flow

1. Pre-record 3 runs (Gen Z V1, AI Agent V1, Gen Z V2)
2. Show video playback with thought bubbles
3. Highlight LLM-generated reasoning
4. Show TKF insights and improvements

## 📊 Status

| Component | Status |
|-----------|--------|
| Research & Design | ✅ Complete |
| POC 1 (Scripted) | ✅ Complete |
| POC 2 (LLM-Driven) | ✅ Complete |
| TKF Adapter | ✅ Complete |
| UI Integration | 📋 Planned (not implemented) |

## 🔗 Integration with Mimica

```typescript
// Load a Playwright run
import { adaptPlaywrightRunForTKF } from './lib/playwright/adapter';

const { steps, metadata, videoPath } = adaptPlaywrightRunForTKF('run-123');

// Feed to TKF
steps.forEach(step => tkfAggregator.processStep(step));

// Get insights
const insights = tkfAggregator.getInsights();
```

## 🤝 Contributing

See individual documentation files for implementation details and next steps.

## 📝 License

Part of the Mimica project.

---

**For detailed information, start with [playwright-implementation-summary.md](./docs/playwright-implementation-summary.md)**

