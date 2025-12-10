# Playwright Recording Research - Headless Video & Trace Capture

## Date: December 2025
## Purpose: Support Mimica Hackathon POC for AI/UX Agent Persona Testing

---

## 1. Playwright Video Recording Configuration

### Configuration in `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Video recording options
    video: 'on',  // Options: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry'
    
    // Video size (optional, defaults to viewport size)
    videoSize: { width: 1280, height: 720 },
    
    // Trace recording (captures detailed timeline)
    trace: 'on',  // Options: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry'
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
  },
  
  // Output directory for test results
  outputDir: 'playwright-runs/test-results',
});
```

### Video Recording Modes
- **`'on'`**: Record video for all tests (best for POC/demo)
- **`'retain-on-failure'`**: Only keep videos when tests fail (saves space)
- **`'on-first-retry'`**: Record on retry attempts
- **`'off'`**: No video recording

### Accessing Video Paths Programmatically

```typescript
import { test } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-element-id="goal-option-balance"]');
  
  // Video path is available after test completion via testInfo
});

test.afterEach(async ({ page }, testInfo) => {
  const video = await page.video();
  if (video) {
    const videoPath = await video.path();
    console.log(`Video saved to: ${videoPath}`);
    // Save videoPath to our run metadata
  }
});
```

### Directory Structure for Recorded Runs

```
playwright-runs/
├── run-{runId}/
│   ├── video.webm          # Main video file
│   ├── trace.zip           # Playwright trace archive
│   ├── events.json         # Our custom event log
│   └── metadata.json       # Run metadata (persona, scenario, etc.)
```

---

## 2. Playwright Trace Capabilities

### What Playwright Traces Contain
Playwright traces (`.zip` files) include:
- **Timeline of all actions**: clicks, navigation, typing, waits
- **Network requests**: all HTTP requests/responses during the test
- **Console logs**: browser console output
- **Screenshots**: before/after each action
- **Source code**: test script that was executed
- **Locators used**: CSS selectors, text selectors, etc.
- **Timing data**: duration of each action, waiting times

### Viewing Traces
```bash
# Open trace viewer UI
npx playwright show-trace playwright-runs/run-123/trace.zip
```

### Extracting Events from Traces Programmatically

Trace files are ZIP archives containing JSON data. We can:
1. Unzip the trace archive
2. Parse `trace.json` or `trace.network` files
3. Extract action events with timestamps

**Alternative**: Instead of parsing traces, we'll **instrument our test scripts** to generate `events.json` directly during execution (see section 3).

---

## 3. Custom Event Logging Strategy

### Approach: Instrument Test Scripts with Custom Logging

Instead of parsing trace files post-hoc, we'll log events as they happen:

```typescript
import { test, Page } from '@playwright/test';
import { writeFileSync } from 'fs';

interface PlaywrightEvent {
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

class EventLogger {
  private events: PlaywrightEvent[] = [];
  private runId: string;
  private personaId: string;
  
  constructor(runId: string, personaId: string) {
    this.runId = runId;
    this.personaId = personaId;
  }
  
  async logAction(
    action: string,
    selector: string,
    reasoningText: string,
    status: string = 'success'
  ) {
    const elementId = await this.extractElementId(selector);
    
    this.events.push({
      runId: this.runId,
      personaId: this.personaId,
      stepIndex: this.events.length,
      targetSelector: selector,
      targetElementId: elementId,
      action: action as any,
      reasoningText,
      status: status as any,
      timestamp: Date.now(),
    });
  }
  
  private async extractElementId(selector: string): Promise<string | undefined> {
    // If selector is [data-element-id="foo"], extract "foo"
    const match = selector.match(/data-element-id=["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }
  
  save(outputPath: string) {
    writeFileSync(outputPath, JSON.stringify(this.events, null, 2));
  }
}
```

### Usage in Test Script

```typescript
test('AI persona run', async ({ page }) => {
  const logger = new EventLogger('run-001', 'gen-z-creator');
  
  await page.goto('http://localhost:3000/app');
  
  // Step 1
  await logger.logAction(
    'WAIT',
    'body',
    'Looking at the onboarding screen...',
    'success'
  );
  await page.waitForTimeout(1000);
  
  // Step 2
  await logger.logAction(
    'HOVER',
    '[data-element-id="goal-option-maximize"]',
    'Hmm, "Maximize Output"... what does that even mean?',
    'confused'
  );
  await page.hover('[data-element-id="goal-option-maximize"]');
  await page.waitForTimeout(2000);
  
  // Step 3
  await logger.logAction(
    'CLICK',
    '[data-element-id="goal-option-balance"]',
    'I guess "Balance Work & Life" makes the most sense.',
    'success'
  );
  await page.click('[data-element-id="goal-option-balance"]');
  
  // Save event log
  logger.save('playwright-runs/run-001/events.json');
});
```

---

## 4. Attaching Reasoning Text via LLM

### Strategy for LLM-Driven Reasoning

For the LLM-driven POC (POC 2), we'll inject reasoning at each step:

```typescript
async function getLLMReasoning(
  persona: Persona,
  currentScreen: string,
  availableActions: string[]
): Promise<{ action: string; reasoning: string }> {
  // Call LLM (via Anthropic SDK, OpenAI SDK, or MCP)
  const response = await llm.complete({
    system: `You are ${persona.name}, ${persona.description}.
Your goals: ${persona.goals.join(', ')}.
Your pain points: ${persona.painPoints.join(', ')}.`,
    user: `You are on screen: ${currentScreen}.
Available actions: ${availableActions.join(', ')}.

What do you do next? Respond in JSON:
{
  "action": "click goal-option-balance",
  "reasoning": "Your thought process in first person..."
}`,
  });
  
  return JSON.parse(response.text);
}
```

### Integration with Event Logger

```typescript
test('LLM-driven persona run', async ({ page }) => {
  const logger = new EventLogger('run-llm-001', 'ai-ux-agent');
  const persona = getPersonaById('ai-ux-agent');
  
  await page.goto('http://localhost:3000/app');
  
  // Get available actions from page
  const actions = await page.$$eval('[data-element-id]', els =>
    els.map(el => el.getAttribute('data-element-id'))
  );
  
  // Ask LLM what to do
  const { action, reasoning } = await getLLMReasoning(
    persona,
    'onboarding-step-0',
    actions
  );
  
  // Log and execute
  await logger.logAction('CLICK', `[data-element-id="${action}"]`, reasoning);
  await page.click(`[data-element-id="${action}"]`);
  
  // Continue loop...
  
  logger.save('playwright-runs/run-llm-001/events.json');
});
```

---

## 5. Playwright MCP Server Integration

### What the Playwright MCP Server Provides

The Playwright MCP server exposes tools for AI agents to control browsers:
- **`navigate_to(url)`**: Navigate to a URL
- **`click(selector)`**: Click an element
- **`type(selector, text)`**: Type into an input
- **`screenshot()`**: Take a screenshot
- **`evaluate(script)`**: Run JavaScript in the page

### Installation & Running

```bash
# Option 1: npm
npm install -g @executeautomation/playwright-mcp-server

# Option 2: Docker
docker run -d -i --rm --init \
  --name playwright-mcp \
  -p 8931:8931 \
  mcr.microsoft.com/playwright/mcp \
  cli.js --headless --browser chromium --port 8931
```

### MCP Client Configuration (for Cursor)

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}
```

### Calling MCP from Backend (Alternative)

We can also call the MCP server from our Node.js backend:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['@executeautomation/playwright-mcp-server'],
});

const client = new Client({
  name: 'mimica-backend',
  version: '1.0.0',
}, {
  capabilities: {},
});

await client.connect(transport);

// Call Playwright MCP tools
const result = await client.callTool({
  name: 'playwright_navigate',
  arguments: { url: 'http://localhost:3000/app' },
});
```

---

## 6. Headless vs Non-Headless Modes

### Headless Mode (Recommended for Demo)
- **Pros**:
  - Reliable, no display requirements
  - Runs on servers without GUI
  - Video + trace recording works perfectly
  - Can run multiple instances in parallel
- **Cons**:
  - Can't watch live
  - Slightly different behavior (rarely)

### Non-Headless Mode (Live Demo)
- **Pros**:
  - Can project browser window live
  - More impressive for audience
- **Cons**:
  - Riskier (browser crashes, display issues)
  - Requires GUI environment
  - Harder to debug if something goes wrong

### Recommendation
**Use headless with pre-recorded videos for the hackathon demo**. This ensures:
1. Reliable, reproducible results
2. High-quality video output we can confidently play
3. We can re-run and pick the best recording

---

## 7. POC Implementation Checklist

### POC 1: Headless Playwright with Video + Events
- [ ] Set up Playwright in the repo
- [ ] Configure `playwright.config.ts` with video/trace enabled
- [ ] Implement `EventLogger` class
- [ ] Write a fixed-script test for one persona (gen-z-creator on v1)
- [ ] Verify video, trace, and events.json are generated
- [ ] Test video playback in browser

### POC 2: LLM-Driven Persona via MCP
- [ ] Install and run Playwright MCP server
- [ ] Implement `getLLMReasoning()` function (use Anthropic SDK)
- [ ] Create agent loop that:
  - Observes current page state
  - Asks LLM for next action + reasoning
  - Executes action via Playwright
  - Logs to events.json
- [ ] Verify reasoning text appears in events.json
- [ ] Test with AI UX Agent persona

### Integration with Mimica
- [ ] Design adapter to read `events.json` → `SimulationStep[]`
- [ ] Add video player component to lab UI
- [ ] Add run selector (dropdown: persona + runId)
- [ ] Sync video playback with TKF timeline (stretch)

---

## Summary & Recommendations

### Key Findings
1. **Video recording**: Use `video: 'on'` in config, retrieve paths via `page.video().path()`
2. **Traces**: Contain rich metadata but parsing is complex; better to log events directly
3. **Custom logging**: Instrument tests with `EventLogger` class to generate `events.json`
4. **LLM reasoning**: Call LLM at each step to get action + reasoning text
5. **MCP integration**: Playwright MCP server can be called from Cursor or our backend

### Best Path Forward for Hackathon
1. **Start with POC 1** (fixed script) to validate video + event logging pipeline
2. **Move to POC 2** (LLM-driven) once POC 1 is stable
3. **Use headless mode** with video recording for demo reliability
4. **Store runs** in `playwright-runs/<runId>/` with video, trace, events, metadata
5. **Integrate with TKF** by converting `events.json` to `SimulationStep[]`

### File Paths to Create
- `lib/playwright/EventLogger.ts` - Event logging utility
- `lib/playwright/run-persona.ts` - Main test runner
- `lib/playwright/llm-agent.ts` - LLM reasoning integration
- `lib/playwright/adapter.ts` - Convert Playwright events to SimulationStep[]
- `playwright.config.ts` - Playwright configuration
- `playwright-runs/` - Output directory for all runs

