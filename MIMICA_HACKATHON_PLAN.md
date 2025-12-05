---
name: mimica-hackathon-polish
overview: Review current Mimica implementation against original plan and define the remaining work for the hackathon, including must-have items, stretch goals, and how 3–4 people can work in parallel.
todos:
  - id: llm-personas
    content: Implement real LLM-driven personas for at least one full flow
    status: pending
  - id: playwright-poc
    content: Implement Playwright-based real-browser runner prototype
    status: pending
  - id: run-all-personas
    content: Add sequential Run All Personas orchestration and progress indicator
    status: pending
    dependencies:
      - llm-personas
      - playwright-poc
  - id: demo-hardening
    content: Harden end-to-end demo flow and define simple reset strategy
    status: pending
    dependencies:
      - llm-personas
      - playwright-poc
      - run-all-personas
  - id: tkf-clarity
    content: Improve TKF clarity and storytelling (legend, labels, projector-ready styling)
    status: pending
  - id: tkf-drilldown
    content: Add click-to-expand evidence drill-down for TKF insights
    status: pending
    dependencies:
      - tkf-clarity
  - id: bubble-ux
    content: Tune thought bubble UX and left-side flow for clarity
    status: pending
  - id: baseline-scorecard
    content: Refine baseline and scorecard behaviour and visuals
    status: pending
  - id: ux-pass
    content: Perform full UX and visual pass including final polish for overall demo experience
    status: pending
    dependencies:
      - tkf-clarity
      - bubble-ux
      - baseline-scorecard
  - id: docs-narrative
    content: Update demo docs and narrative to match final UI and flows
    status: pending
    dependencies:
      - ux-pass
---

## Mimica Hackathon – Prioritized Backlog (Finalized)

### A. One-line Backlog (Highest Priority First)

1. Implement real LLM-driven personas for at least one full flow (bounded, reliable scope).
2. Implement a Playwright-based real-browser runner prototype, or gracefully fall back if too brittle.
3. Add a sequential "Run All Personas" orchestration and simple progress indicator.
4. Harden the end-to-end demo flow (including current scripted mode) and add a simple way to recover/reset.
5. Improve TKF clarity and storytelling (legend, human-readable labels, projector-ready styling).
6. Add click-to-expand evidence drill-down for individual TKF insights.
7. Tune thought bubble UX and left-side flow for a smooth, readable demo experience.
8. Refine baseline and scorecard behaviour and visuals to clearly show before/after improvements.
9. Perform a full UX and visual pass (including final theming tweaks and animation timing polish) to make the overall experience as smooth and attractive as possible.
10. Update demo documentation and narrative (DEMO_GUIDE and DEMO_QUICKREFERENCE) to match the final UI.

---

### B. Suggested Workstreams & Parallelization (3 People)

Assume **3 people** for the hackathon day. The idea is to split the big realism work (LLM + Playwright) across two people, while a third focuses on TKF/UX so that most of the backlog can progress in parallel.

#### B1. Dependency Overview

- **Item 1 (LLM personas)** and **Item 2 (Playwright)** are the main realism enablers.
- **Item 3 (Run All Personas)** and **Item 4 (demo hardening/reset)** can be implemented **first for the scripted/non-LLM path**, and then extended to LLM/Playwright once items 1–2 are stable.
- **Items 5–8 (TKF clarity, drill-down, bubbles, scorecard)** are largely independent of 1–2 and can be done in parallel; they feed into **Item 9 (global UX pass)**.
- **Item 10 (docs & narrative)** should happen after 1–9 are mostly settled.

#### Person 1 – LLM Personas Owner (Backlog 1, plus input to 3–4)

- **Phase 1 – LLM core (Item 1):**
- Design the prompt and constrained action set for at least one persona (e.g. Alex).
- Implement the LLM client/integration, plugging into the existing simulation engine so that:
  - Actions come from the model (within a safe set).
  - Reasoning text is stored as `reasoningText` for bubbles and TKF.
- Keep one scripted persona as a fully reliable fallback.
- **Phase 2 – Stabilisation:**
- Work with Person 2 to ensure Run All Personas (Item 3) can invoke the LLM persona reliably.
- Help Person 2/3 debug any LLM-specific edge cases discovered during demo hardening (Item 4).

#### Person 2 – Playwright & Orchestration Owner (Backlog 2, 3, 4)

- **Phase 1 – Scripted baseline:**
- Implement a small Playwright script (Item 2) that can:
  - Launch the local app in a real browser.
  - Drive a **scripted** onboarding run end-to-end (no LLM yet).
- Implement **Run All Personas** for the scripted flows (Item 3):
  - Sequentially run all personas in the embedded app.
  - Show current persona and simple progress in the UI.
- Start **demo hardening/reset** for the scripted path (Item 4):
  - Ensure scripted runs complete cleanly.
  - Decide on and implement a simple reset (page refresh or light Reset Demo button).
- **Phase 2 – Extend to LLM/Playwright:**
- Once Person 1’s LLM persona is ready, allow Run All Personas to include the LLM persona.
- Optionally, wire LLM decisions into the Playwright script (even for just one persona/flow) and verify it can complete at least one LLM-driven run.
- Re-run hardening tests (Item 4) with LLM/Playwright in the loop.

#### Person 3 – TKF, Bubbles, Scorecard & UX Owner (Backlog 5–10)

- **Phase 1 – TKF & evidence (Items 5–6):**
- Improve TKF clarity: legend, human-readable element labels, projector-friendly typography.
- Implement TKF evidence drill-down: click a card to show reasoning snippets and contributing personas/elements.
- **Phase 2 – Bubbles & metrics (Items 7–8):**
- Tune thought bubble timing/placement so the left side is readable and not cluttered.
- Refine baseline/scorecard visuals so before/after improvements are obvious at a glance.
- **Phase 3 – Global UX & docs (Items 9–10):**
- Lead the full UX/visual pass across the whole Control Room, coordinating with Persons 1–2 to avoid visual regressions.
- Once behaviours stabilise, update `DEMO_GUIDE.md` and `DEMO_QUICK_REFERENCE.md` to reflect the final flow, including where LLM and Playwright are shown.

#### Coordination Checkpoints

- **Checkpoint 1 (mid-day):**
- Person 1 has a first LLM persona running in the embedded app.
- Person 2 has Run All Personas + reset working for scripted flows, and a basic Playwright script that can run one scripted flow.
- Person 3 has TKF legend + humanized labels in place.
- **Checkpoint 2 (late afternoon):**
- LLM persona has been run through Run All Personas at least once; any issues are known.
- Playwright script has been tried with LLM once (even if it’s not used live, you know its current reliability).
- TKF drill-down, bubbles tuning, and scorecard visuals are in place; global UX pass is underway.
- **End state:**
- Items 1–9 are demo-ready, with 10 (docs/narrative) locked before the actual presentation.

---

### C. Detailed Backlog Items

#### 1. Implement real LLM-driven personas (bounded scope)

- Goal: make at least one persona (for example, Alex) genuinely driven by an LLM, not just static scripted data.
- Approach:
- Keep the existing event and element-ID model so the UI, bubbles, and TKF do not need large structural changes.
- Let the LLM choose among a constrained set of allowed actions (which goal to select, when to continue/back/skip, etc.) based on:
  - Persona description and goals.
  - Current screen summary and list of available elements (using human-friendly labels).
  - Recent TKF insights where useful.
- Use the LLM’s text as `reasoningText` so thought bubbles and TKF show real model output.
- Keep current scripted personas as a reliable fallback for the live demo.

#### 2. Implement a Playwright-based real-browser runner prototype

- Goal: demonstrate that Mimica can drive a real browser, not just an embedded React component.
- Scope:
- Create a small Playwright script/module that can:
  - Launch the local FocusFlow app in a real browser.
  - Perform one full onboarding run using either scripted actions or LLM-decided actions.
- Optionally expose this via a developer control (for example, a "Run in Real Browser" button) while keeping the embedded app as the default for the live demo.
- If Playwright proves too flaky, keep the prototype in the repo and explain it as the next step, while relying on the embedded app for the hackathon demo.

#### 3. Add a sequential "Run All Personas" orchestration

- Implement orchestration in `SimulationContext` / `app/lab/page.tsx` that:
- Iterates through all personas for the selected scenario and UI version.
- Runs each persona one after another (not in parallel) to avoid visual overload.
- UI changes:
- Add a "Run All Personas" button.
- Show which persona is currently active and a simple progress indicator (for example, 1/3, 2/3, 3/3).
- This provides a smooth story of several different users testing the same flow without cluttering the screen with multiple app views.

#### 4. Harden the end-to-end demo flow and add a simple recovery path

- Validate that both scripted and LLM-driven flows (and Playwright where used) can:
- Start from a clean state.
- Run a full scenario for the main demo persona.
- Produce TKF insights and a scorecard without getting stuck (disabled buttons, wrong step, desynchronised state).
- Define a simple recovery strategy for the hackathon:
- If state is entirely in memory, a full page refresh can be the main reset mechanism; document this in the demo guide.
- If needed, add a light "Reset Demo" button that clears TKF and baseline, clears simulation state and highlighted element, and resets to default persona/scenario and UI version.

#### 5. Improve TKF clarity and storytelling

- In `components/lab/TKFView.tsx`:
- Add a compact legend explaining persona lanes and colours, severity bars (scale and colour meaning), and resolved/improved states.
- Ensure all element labels use `humanizeElementId` so they read as human descriptions (for example, "Continue button" or "Guidance Level Slider") rather than internal IDs.
- Review TKF typography and spacing for projector readability (font sizes, contrast, line length).
- Make sure the TKF panel clearly communicates that it is the system’s knowledge fabric: a structured memory of issues and improvements.

#### 6. Add TKF evidence drill-down

- Extend TKF cards so that clicking a card reveals more detail for that insight:
- A few reasoning snippets taken from the `SimulationStep` entries referenced by `TKFInsight.evidence`.
- A small list of personas and elements that contributed to the insight.
- Keep the drill-down lightweight (inline expansion or small side panel) so it enhances the story without overwhelming the main view.
- Clarify that item 5 is about high-level clarity, while this item is about deeper evidence inspection.

#### 7. Tune thought bubble UX and left-side flow

- In `components/lab/ThoughtBubble.tsx` and the lab layout:
- Limit concurrent bubbles to the most recent one or two, with earlier ones fading out faster.
- Adjust positions and offsets so bubbles do not cover critical CTAs for long periods.
- Time the left-side flow so it feels like: element highlight, then bubble appears with reasoning, then the knowledge thread animation, then TKF update.
- Manually walk through the left side as a first-time viewer to ensure it is clear and pleasant to watch.

#### 8. Refine baseline and scorecard behaviour and visuals

- Clarify baseline semantics:
- For the hackathon, plan the script so that the same persona is used before and after; treat baseline as per-persona in practice or enforce this in state if needed.
- In `components/lab/PersonaScorecard.tsx`:
- Make the before/after numbers for experience score and key metrics (confusion, blocked, delighted) highly visible and quick to interpret.
- Use arrows, colours, and mini bars so the direction and magnitude of change are obvious even from the back of the room.
- Ensure baseline cannot be accidentally overwritten during the demo except through an intentional action.

#### 9. Perform a full UX and visual pass (including final polish)

- Conduct a holistic UX and visual review of the entire Control Room:
- Header, controls, app preview, thought bubbles, scorecard, TKF fabric, and flow animation should feel like one cohesive product.
- Fix any awkward spacing, alignment issues, inconsistent typography, or visually empty or overly busy areas.
- Focus on reinforcing the three main "wow" moments:
- Personas thinking on the UI (bubbles and actions).
- Knowledge threads flowing into the TKF fabric and insights weaving in.
- Scorecard clearly showing before/after improvements.
- As part of this item, also apply the final small theming tweaks and animation timing adjustments:
- Nudge animation durations and delays so the bubble -> thread -> TKF card chain feels intentional rather than rushed or random.
- Correct minor inconsistencies in colours, hover states, and borders that remain after functionality is complete.

#### 10. Update demo documentation and narrative

- After items 1–9 stabilise, update `DEMO_GUIDE.md` and `DEMO_QUICK_REFERENCE.md` to match the final UI and flows:
- Document when to use LLM mode versus scripted runs and whether/when to show the Playwright prototype.
- Script a concise 5–7 minute story: problem, personas and TKF, coding agent improving the UI, and measurable before/after experience changes.
- Include concise troubleshooting notes so anyone on the team can operate the demo and recover from common issues during the hackathon.