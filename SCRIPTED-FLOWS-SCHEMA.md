# Scripted Flows JSON Schema

## Overview

This document defines the JSON schema for scripted Playwright persona flows. Scripts are data-driven, allowing us to modify flows without changing Python code.

## Directory Structure

```
backend/
└── playwright-scripts/
    ├── v1/
    │   ├── gen-z-creator.json
    │   ├── busy-parent.json
    │   ├── non-native-speaker.json
    │   └── ai-ux-agent.json
    └── v2/
        ├── gen-z-creator.json
        ├── busy-parent.json
        ├── non-native-speaker.json
        └── ai-ux-agent.json
```

## JSON Schema

### Top-Level Structure

```json
{
  "persona_id": "gen-z-creator",
  "persona_name": "Alex Chen",
  "ui_version": "v1",
  "scenario_id": "onboarding",
  "description": "Gen Z content creator testing V1 onboarding",
  "steps": [
    // Array of ScriptedStep objects
  ]
}
```

### ScriptedStep Object

```json
{
  "screen_id": "step-0",
  "action": "HOVER",
  "selector": "[data-element-id='goal-option-maximize']",
  "value": null,
  "reasoning": "Hmm, 'Maximize Output'... what does that even mean? Is that like, work harder?",
  "status": "confused",
  "wait_before_ms": 0,
  "wait_after_ms": 2000
}
```

## Field Definitions

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `persona_id` | string | Yes | Unique persona identifier (e.g., `gen-z-creator`) |
| `persona_name` | string | Yes | Human-readable persona name (e.g., `Alex Chen`) |
| `ui_version` | string | Yes | UI version to test (`v1` or `v2`) |
| `scenario_id` | string | Yes | Scenario being tested (e.g., `onboarding`) |
| `description` | string | Yes | Brief description of this test run |
| `steps` | ScriptedStep[] | Yes | Array of steps to execute |

### ScriptedStep Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `screen_id` | string | Yes | Screen identifier (e.g., `step-0`, `step-1`) |
| `action` | string | Yes | Action type: `CLICK`, `HOVER`, `TYPE`, `WAIT`, `NAVIGATE`, `SELECT`, `SCROLL` |
| `selector` | string | Yes | CSS selector (typically `[data-element-id='...']`) |
| `value` | string\|null | No | Value for `TYPE` actions, null otherwise |
| `reasoning` | string | Yes | First-person narrative text for thought bubbles and TKF |
| `status` | string | No | Event status: `success`, `confused`, `blocked`, `delighted` (default: `success`) |
| `wait_before_ms` | number | No | Milliseconds to wait before executing this step (default: `0`) |
| `wait_after_ms` | number | No | Milliseconds to wait after executing this step (default: `1000`) |

## Action Types

### CLICK
Click on an element.
```json
{
  "action": "CLICK",
  "selector": "[data-element-id='step0-continue']",
  "reasoning": "I'll click continue to move forward"
}
```

### HOVER
Hover over an element (for exploration/confusion).
```json
{
  "action": "HOVER",
  "selector": "[data-element-id='goal-option-maximize']",
  "reasoning": "What does 'Maximize Output' mean?",
  "wait_after_ms": 2000
}
```

### TYPE
Type text into an input field.
```json
{
  "action": "TYPE",
  "selector": "[data-element-id='name-input']",
  "value": "Alex Chen",
  "reasoning": "Entering my name"
}
```

### WAIT
Pause to read or think.
```json
{
  "action": "WAIT",
  "selector": "body",
  "reasoning": "Taking a moment to read all the options",
  "wait_after_ms": 3000
}
```

### NAVIGATE
Navigate to a specific URL (rarely used, initial navigation is automatic).
```json
{
  "action": "NAVIGATE",
  "selector": "/lab?version=v1",
  "reasoning": "Loading the onboarding flow"
}
```

## Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| `success` | Action completed without issue | Default for smooth interactions |
| `confused` | User is confused or uncertain | Unclear UI, ambiguous labels |
| `blocked` | User cannot proceed | Disabled button, missing information |
| `delighted` | User is pleased with experience | Clear UI, helpful feedback |

## Timing Guidelines

- **`wait_before_ms`**: Use sparingly, mainly for initial screen loads
- **`wait_after_ms`**: 
  - `500-1000ms`: Quick clicks/types
  - `2000-3000ms`: Hovers and reading (confusion)
  - `3000-4000ms`: Deep thinking or comparing options
  - Keep total flow under 60 seconds for watchability

## Example: Complete Gen Z Creator Flow

```json
{
  "persona_id": "gen-z-creator",
  "persona_name": "Alex Chen",
  "ui_version": "v1",
  "scenario_id": "onboarding",
  "description": "Gen Z creator confused by unclear language in V1",
  "steps": [
    {
      "screen_id": "step-0",
      "action": "HOVER",
      "selector": "[data-element-id='goal-option-maximize']",
      "reasoning": "Hmm, 'Maximize Output'... what does that even mean?",
      "status": "confused",
      "wait_after_ms": 2000
    },
    {
      "screen_id": "step-0",
      "action": "HOVER",
      "selector": "[data-element-id='goal-option-optimize']",
      "reasoning": "'Optimize Workflow' vs 'Maximize Output'... these sound like the same thing?",
      "status": "confused",
      "wait_after_ms": 2500
    },
    {
      "screen_id": "step-0",
      "action": "CLICK",
      "selector": "[data-element-id='goal-option-balance']",
      "reasoning": "I guess 'Balance' sounds less corporate-y? Going with that.",
      "status": "success",
      "wait_after_ms": 1500
    }
  ]
}
```

## Validation Rules

1. **Required fields**: All required fields must be present
2. **Valid actions**: Action must be one of the allowed types
3. **Selector format**: Should use `[data-element-id='...']` for consistency
4. **Status values**: Must be one of: `success`, `confused`, `blocked`, `delighted`
5. **UI version**: Must be `v1` or `v2`
6. **Reasoning text**: Should be non-empty and in first person

## Python Pydantic Models

The schema is enforced in Python using Pydantic models in `backend/src/playwright/script_models.py`.

## Usage

Scripts are loaded by the `ScriptedRunner` which:
1. Validates the JSON against this schema
2. Executes each step in order
3. Logs events with the provided reasoning
4. Produces video, trace, events.json, and metadata.json

See `backend/src/playwright/scripted_runner.py` for implementation details.

