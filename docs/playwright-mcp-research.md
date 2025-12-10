# Playwright MCP Server Research & Integration Design

## Date: December 2025
## Purpose: Design MCP-based interface for AI/UX Agent persona testing

---

## 1. Model Context Protocol (MCP) Overview

### What is MCP?
The Model Context Protocol (MCP) is a standard for connecting AI models to external tools and data sources. It provides:
- **Tools**: Functions that AI agents can call (e.g., "click_element", "navigate_to")
- **Resources**: Data that agents can read (e.g., page content, screenshots)
- **Prompts**: Pre-defined templates for agent interactions

### MCP Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   MCP Client    │ ◄─────► │   MCP Server     │ ◄─────► │   Playwright    │
│ (Cursor/Backend)│         │ (playwright-mcp) │         │ Browser Instance│
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                             │                            │
        │ Call tools via JSON-RPC     │ Executes browser actions   │
        │ Receive results             │ Returns results + artefacts│
        └─────────────────────────────┴────────────────────────────┘
```

---

## 2. Playwright MCP Server Capabilities

### Installation & Setup

```bash
# Option 1: npm (for development)
npm install -g @executeautomation/playwright-mcp-server

# Option 2: Docker (for production/server)
docker run -d -i --rm --init \
  --name playwright-mcp \
  -p 8931:8931 \
  mcr.microsoft.com/playwright/mcp \
  cli.js --headless --browser chromium --port 8931
```

### Available Tools (Common MCP Playwright Tools)

Based on typical MCP Playwright implementations, the server likely exposes:

1. **`playwright_navigate`**
   - Navigate to a URL
   - Arguments: `{ url: string }`

2. **`playwright_click`**
   - Click an element by selector
   - Arguments: `{ selector: string }`

3. **`playwright_type`**
   - Type text into an input
   - Arguments: `{ selector: string, text: string }`

4. **`playwright_screenshot`**
   - Take a screenshot
   - Arguments: `{ path?: string, fullPage?: boolean }`
   - Returns: base64 image or file path

5. **`playwright_evaluate`**
   - Execute JavaScript in page context
   - Arguments: `{ script: string }`

6. **`playwright_wait_for_selector`**
   - Wait for an element to appear
   - Arguments: `{ selector: string, timeout?: number }`

7. **`playwright_get_text`**
   - Get text content of an element
   - Arguments: `{ selector: string }`

8. **`playwright_get_page_content`**
   - Get full HTML of current page
   - Returns: HTML string

### Configuration

MCP server configuration (e.g., in `~/.config/mcp/config.json` for Cursor):

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp",
      "capabilities": {
        "video": true,
        "trace": true,
        "screenshots": true
      }
    }
  }
}
```

---

## 3. Designing `run_persona_flow` Tool

### High-Level Design

We need a custom MCP tool that orchestrates a complete persona test run:

```typescript
// Tool signature
interface RunPersonaFlowArgs {
  personaId: string;        // e.g., "gen-z-creator", "ai-ux-agent"
  scenarioId: string;       // e.g., "onboarding-v1"
  uiVersion: 'v1' | 'v2';
  appUrl: string;           // e.g., "http://localhost:3000/app"
  mode: 'scripted' | 'llm-driven';  // POC 1 vs POC 2
}

interface RunPersonaFlowResult {
  runId: string;
  success: boolean;
  videoPath: string;
  tracePath: string;
  eventsPath: string;
  error?: string;
}
```

### Implementation Approaches

#### Approach A: Extend Playwright MCP Server (Harder)
Build a custom MCP server that wraps `@executeautomation/playwright-mcp-server` and adds our `run_persona_flow` tool:

**Pros:**
- True MCP integration
- Can be called from Cursor or any MCP client
- Follows MCP standard

**Cons:**
- Requires building a custom MCP server
- More complex setup
- Harder to debug during hackathon

#### Approach B: Separate Orchestrator + MCP Tools (Recommended)
Keep the standard Playwright MCP server and build a separate orchestrator that:
- Uses MCP tools to control the browser
- Manages the persona flow logic
- Generates video/events/metadata

**Pros:**
- Simpler architecture
- Can still use MCP for browser control
- Easier to iterate during hackathon
- Can run standalone or via MCP wrapper later

**Cons:**
- Not a "pure" MCP tool initially
- Requires wrapping if we want Cursor to call it directly

### Recommended Architecture (Approach B)

```
┌──────────────────────────────────────────────────────────┐
│                 Mimica Orchestrator                       │
│  (lib/playwright/persona-orchestrator.ts)                │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ runPersonaFlow(personaId, scenario, mode)           │ │
│  │   1. Load persona from personas.ts                  │ │
│  │   2. Start Playwright with video/trace              │ │
│  │   3. If scripted: execute fixed script              │ │
│  │   4. If LLM: loop with LLM for each action          │ │
│  │   5. Log events to events.json                      │ │
│  │   6. Save video + trace + metadata                  │ │
│  │   7. Return run results                             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  Can be called:                                           │
│  - Directly from backend (TypeScript)                    │
│  - Via CLI script                                        │
│  - (Future) Wrapped as MCP tool                          │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌───────────────────────┐
            │   Playwright API      │
            │ (direct, not via MCP) │
            └───────────────────────┘
```

---

## 4. MCP Integration Points

### Point 1: Cursor MCP Client (Demo Trigger)

During the demo, we could trigger a run from Cursor by:
1. Open Cursor's command palette
2. Call an MCP tool (if we wrap the orchestrator)
3. Or: run a CLI command from Cursor's terminal

Example Cursor interaction:
```
User: Run the gen-z-creator persona on v1
Cursor (via MCP): Calling run_persona_flow...
Result: Run complete! runId: run-abc123
        Video: playwright-runs/run-abc123/video.webm
```

### Point 2: Backend Direct Integration

For the Mimica lab UI, we can call the orchestrator directly:

```typescript
// In app/lab/page.tsx or a new API route
import { runPersonaFlow } from '@/lib/playwright/persona-orchestrator';

async function handleRunPersona() {
  const result = await runPersonaFlow({
    personaId: 'gen-z-creator',
    scenarioId: 'onboarding',
    uiVersion: 'v1',
    appUrl: 'http://localhost:3000/app',
    mode: 'scripted',
  });
  
  // Load and display the run
  loadPlaywrightRun(result.runId);
}
```

---

## 5. LLM Integration for POC 2

### LLM Agent Loop Design

```typescript
async function llmDrivenPersonaFlow(
  page: Page,
  persona: Persona,
  logger: EventLogger
): Promise<void> {
  let currentScreen = 'step-0';
  let maxSteps = 20;
  
  for (let step = 0; step < maxSteps; step++) {
    // 1. Observe current page state
    const availableElements = await page.$$eval('[data-element-id]', els =>
      els.map(el => ({
        id: el.getAttribute('data-element-id'),
        text: el.textContent?.trim() || '',
        type: el.tagName.toLowerCase(),
      }))
    );
    
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        visibleText: document.body.innerText.substring(0, 500),
      };
    });
    
    // 2. Ask LLM what to do next
    const { action, selector, reasoning, shouldContinue } = 
      await getLLMDecision(persona, pageContent, availableElements);
    
    if (!shouldContinue) {
      await logger.logAction('WAIT', 'body', 'Flow complete', 'success');
      break;
    }
    
    // 3. Execute action
    await logger.logAction(action, selector, reasoning, 'success');
    
    if (action === 'CLICK') {
      await page.click(selector);
    } else if (action === 'TYPE') {
      await page.type(selector, reasoning); // Or separate text arg
    } else if (action === 'HOVER') {
      await page.hover(selector);
    }
    
    // 4. Wait for page to settle
    await page.waitForTimeout(1000);
    
    // 5. Update screen ID if changed
    const newScreen = await page.evaluate(() => 
      document.querySelector('[data-screen-id]')?.getAttribute('data-screen-id')
    );
    if (newScreen) currentScreen = newScreen;
  }
}

async function getLLMDecision(
  persona: Persona,
  pageContent: any,
  availableElements: any[]
): Promise<{
  action: 'CLICK' | 'TYPE' | 'HOVER' | 'WAIT';
  selector: string;
  reasoning: string;
  shouldContinue: boolean;
}> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: `You are ${persona.name}, ${persona.description}.

Your goals: ${persona.goals.join('; ')}.
Your pain points: ${persona.painPoints.join('; ')}.
Your tone: ${persona.tone}

You are testing a web application. At each step, decide what action to take next based on what you see on the page. Think like a real user with your personality and goals.`,
    messages: [{
      role: 'user',
      content: `Current page:
Title: ${pageContent.title}
URL: ${pageContent.url}
Visible text: ${pageContent.visibleText}

Available interactive elements:
${availableElements.map((el, i) => `${i + 1}. [${el.type}] "${el.text}" (id: ${el.id})`).join('\n')}

What do you do next? Respond ONLY with valid JSON in this format:
{
  "action": "CLICK" | "TYPE" | "HOVER" | "WAIT",
  "selector": "[data-element-id='...']",
  "reasoning": "Your first-person thought process explaining why you're doing this",
  "shouldContinue": true | false
}`,
    }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}
```

---

## 6. Tool Interface Specification

### MCP Tool Schema (Future)

If we later wrap the orchestrator as an MCP tool:

```json
{
  "name": "mimica_run_persona_flow",
  "description": "Run a complete AI/UX agent persona test flow with video recording and event logging",
  "inputSchema": {
    "type": "object",
    "properties": {
      "personaId": {
        "type": "string",
        "description": "Persona identifier (gen-z-creator, busy-parent, ai-ux-agent, etc.)",
        "enum": ["gen-z-creator", "busy-parent", "non-native-speaker", "ai-ux-agent"]
      },
      "scenarioId": {
        "type": "string",
        "description": "Scenario to test (e.g., onboarding)",
        "default": "onboarding"
      },
      "uiVersion": {
        "type": "string",
        "enum": ["v1", "v2"],
        "description": "UI version to test",
        "default": "v1"
      },
      "appUrl": {
        "type": "string",
        "description": "URL of the application to test",
        "default": "http://localhost:3000/app"
      },
      "mode": {
        "type": "string",
        "enum": ["scripted", "llm-driven"],
        "description": "Use fixed script or LLM-driven agent",
        "default": "scripted"
      }
    },
    "required": ["personaId"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "runId": { "type": "string" },
      "success": { "type": "boolean" },
      "videoPath": { "type": "string" },
      "tracePath": { "type": "string" },
      "eventsPath": { "type": "string" },
      "error": { "type": "string" }
    }
  }
}
```

### CLI Interface (Immediate)

For the hackathon, we can expose a simple CLI:

```bash
# Run a scripted persona
npm run playwright:run -- --persona=gen-z-creator --version=v1 --mode=scripted

# Run an LLM-driven persona
npm run playwright:run -- --persona=ai-ux-agent --version=v1 --mode=llm-driven

# Output:
# ✓ Starting Playwright run...
# ✓ Recording video and trace...
# ✓ Executing persona flow...
# ✓ Run complete!
#   Run ID: run-20241210-123456
#   Video: playwright-runs/run-20241210-123456/video.webm
#   Events: playwright-runs/run-20241210-123456/events.json
```

---

## 7. Integration with Existing Mimica Code

### Mapping to Existing Types

Our Playwright events should map cleanly to existing `SimulationStep`:

```typescript
// lib/types/index.ts (existing)
export interface SimulationStep {
  stepIndex: number;
  personaId: string;
  screenId: string;
  action: string;
  targetElementId: string;
  reasoningText: string;
  status: 'success' | 'confused' | 'blocked' | 'delighted';
  durationMs?: number;
}

// lib/playwright/types.ts (new)
export interface PlaywrightEvent {
  runId: string;
  personaId: string;
  stepIndex: number;
  screenId?: string;
  targetSelector: string;
  targetElementId?: string;
  action: 'CLICK' | 'HOVER' | 'TYPE' | 'WAIT' | 'NAVIGATE';
  reasoningText: string;
  status: 'success' | 'confused' | 'blocked' | 'delighted';
  timestamp: number;
  durationMs?: number;
}

// Adapter function
function playwrightEventToSimulationStep(event: PlaywrightEvent): SimulationStep {
  return {
    stepIndex: event.stepIndex,
    personaId: event.personaId,
    screenId: event.screenId || 'unknown',
    action: event.action,
    targetElementId: event.targetElementId || event.targetSelector,
    reasoningText: event.reasoningText,
    status: event.status,
    durationMs: event.durationMs,
  };
}
```

---

## 8. Recommended Implementation Plan

### Phase 1: Basic Orchestrator (POC 1)
1. Create `lib/playwright/` directory
2. Implement `EventLogger` class
3. Implement `persona-orchestrator.ts` with `runPersonaFlow()` for scripted mode
4. Add CLI script `scripts/run-playwright-persona.ts`
5. Test with one scripted persona

### Phase 2: LLM Integration (POC 2)
1. Implement `llm-agent.ts` with `getLLMDecision()`
2. Extend orchestrator to support `mode: 'llm-driven'`
3. Test with AI UX Agent persona
4. Refine prompts and reasoning capture

### Phase 3: Mimica Integration
1. Create adapter `playwright-adapter.ts` to convert events
2. Add video player component to lab UI
3. Add run selector/loader
4. Test end-to-end flow

### Phase 4: MCP Wrapper (Optional/Stretch)
1. Build custom MCP server that wraps orchestrator
2. Expose `mimica_run_persona_flow` tool
3. Test from Cursor
4. Document for team

---

## Summary & Next Steps

### Key Decisions
1. **Use Approach B**: Build standalone orchestrator, optionally wrap in MCP later
2. **Direct Playwright API**: Don't rely on existing MCP server tools; use Playwright directly for better control
3. **LLM via Anthropic SDK**: Use Claude 3.5 Sonnet for reasoning generation
4. **CLI + Backend**: Support both CLI invocation and direct backend calls

### File Structure to Create
```
lib/playwright/
├── types.ts                 # PlaywrightEvent, RunMetadata types
├── EventLogger.ts           # Event logging utility
├── persona-orchestrator.ts  # Main runPersonaFlow() function
├── llm-agent.ts            # LLM decision-making logic
└── adapter.ts              # Convert Playwright → SimulationStep

scripts/
└── run-playwright-persona.ts  # CLI wrapper

playwright-runs/
└── <runId>/
    ├── video.webm
    ├── trace.zip
    ├── events.json
    └── metadata.json
```

### Dependencies to Install
```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "@anthropic-ai/sdk": "^0.9.0"
  }
}
```

### Next Todo
Complete the data model design that maps these insights to concrete TypeScript types.

