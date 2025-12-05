# Mimica Hackathon Demo Guide

## Overview

Mimica is an AI-powered UX testing platform that creates a **Trusted Knowledge Fabric (TKF)** from AI persona interactions, then exports insights to coding agents like Cursor for automatic UI improvements.

---

## Demo Flow (Option 3: Real Hot-Reload with Backup)

### Setup Before Demo

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Open the Control Room**: Navigate to `http://localhost:3000/lab`

3. **Have Cursor open** in the background with this project loaded

4. **Verify the setup**:
   - Control Room shows the onboarding UI preview on the left
   - No version toggle visible (this is correct!)
   - Personas are listed in the dropdown

---

## The Demo Script

### **Act 1: The Problem** (2-3 minutes)

**Story**: "We've built this onboarding flow for FocusFlow, but we're not sure how different users will experience it."

1. **Show the baseline UI**:
   - Point to the left panel preview
   - Briefly walk through the 4 steps
   - Note: "We want to understand where users get confused"

2. **Introduce the personas**:
   - Select "Raj Patel - Non-native English speaker"
   - Read his description: careful reader, struggles with jargon
   - Click **"Run Simulation"**

3. **Watch the magic happen**:
   - Persona interacts with the UI (animated highlights)
   - Reasoning appears in the timeline: "What does 'interaction paradigm' mean?"
   - **TKF insights appear on the right** as colorful tiles
   - Point out the severity scores and tags

4. **Run 1-2 more personas** (optional for time):
   - Select "Alex Chen - Gen Z Creator" or "Maria Rodriguez - Busy Parent"
   - Show that multiple personas hit the **same issues**
   - TKF severity scores increase when multiple personas struggle

---

### **Act 2: The TKF Export** (1-2 minutes)

**Story**: "Now we have rich insights. Let's send this to our coding agent."

1. **Click "Export TKF to Coding Agent"**
   - Modal opens with a comprehensive Markdown report
   - Scroll through briefly:
     - Persona descriptions
     - Top insights with severity
     - Concrete recommendations
   - Show the line/token count at bottom

2. **Click "Copy for Cursor"**
   - Confirm "✓ Copied!" appears

---

### **Act 3: The AI Improvement Loop** (3-4 minutes)

**Story**: "Watch what happens when we feed this knowledge to Cursor..."

#### **The Hot-Reload Flow** (Primary Path)

1. **Switch to Cursor**:
   - Open `components/onboarding/OnboardingFlow.tsx`
   - Open Cursor chat (Cmd/Ctrl + L)

2. **Paste the TKF report**:
   ```
   Please implement these UX improvements to the v1 variant of OnboardingFlow
   ```

3. **Let Cursor work**:
   - Cursor analyzes the report
   - Proposes changes (clearer copy, better button hierarchy)
   - Show the diff preview

4. **Apply the changes**:
   - Click "Apply" or "Accept"
   - **Save the file** (Cmd/Ctrl + S)

5. **Return to Mimica Control Room**:
   - The preview on the left **automatically updates** (hot reload!)
   - Point out: "No manual refresh needed"
   - You can see the improved labels and button styling

6. **Re-run the personas**:
   - Select the same persona (e.g., Raj Patel)
   - Click "Run Simulation"
   - **Show the difference**:
     - Less confusion in the reasoning
     - Faster completion
     - New TKF insights show lower severity or positive experiences

---

#### **The Backup Path** (If Hot-Reload Fails)

If something breaks or you want to save time:

1. **Press `b` on your keyboard** (in the Control Room)
   - Version toggle appears at the top
   - Say: "We've also pre-built an improved version to show you the full loop"

2. **Click "v2"**:
   - The preview switches to the improved UI
   - Re-run personas
   - Show the better results

3. **Explain**:
   - "In production, these would be the same code before and after Cursor's edits"
   - "For demo reliability, we have a backup version pre-built"

---

### **Act 4: The Loop Closes** (1 minute)

**Key Points**:

1. **The TKF is the star**:
   - It's not just logs - it's structured, actionable knowledge
   - Severity scoring helps prioritize
   - Evidence from multiple personas builds confidence

2. **The workflow is continuous**:
   - Test → Insights → Improve → Re-test
   - Each cycle builds more TKF
   - The fabric gets richer over time

3. **Real-world application**:
   - Point your own side project at Mimica
   - Run personas on any UI (not just onboarding)
   - Export to any coding agent (Cursor, GitHub Copilot, etc.)

---

## Hidden Features / Emergency Shortcuts

### **Keyboard Shortcuts**

- **`b`**: Toggle the backup version switcher (v1 ↔ v2)
  - Only visible after pressing `b`
  - Useful if hot-reload isn't working smoothly

### **If Simulations Break**

- Check the browser console for errors
- Refresh the page (simulations are stateless)
- Worst case: use the v2 backup

### **If Next.js Hot-Reload Fails**

- Save the file again in Cursor
- Manually refresh the Control Room page
- Fall back to the v2 toggle (press `b`)

---

## Talking Points for Judges

### **What Makes Mimica Unique?**

1. **AI personas as first-class testers**:
   - Not just A/B testing with real users
   - Instant feedback with diverse perspectives
   - No recruiting, no scheduling, no biases

2. **Trusted Knowledge Fabric**:
   - Not just logs or analytics
   - Structured insights with reasoning
   - Builds over time, gets smarter
   - Exportable to any tool

3. **Closes the loop**:
   - Most tools stop at "here's the problem"
   - Mimica goes from problem → TKF → code → validation
   - True AI-augmented development

### **What's Implemented vs. Future Vision?**

**✅ Implemented** (in 1 day!):
- Full Next.js + React + TypeScript app
- 3 rich personas with handcrafted behavior
- Simulation engine with visual timeline
- TKF aggregation with severity scoring
- Beautiful animated "fabric" visualization
- Export to Cursor with Markdown reports
- Hot-reload architecture (v1 lives in the codebase)
- v2 backup for demo safety

**🚀 Future (stretch goals)**:
- Real LLM-powered personas (GPT-4, Claude, etc.)
- Playwright integration for real browser automation
- Project management (point at any localhost app)
- JS SDK for better UI understanding
- Historical TKF tracking and diffing
- Team collaboration features

---

## Pre-Demo Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Control Room loaded (`/lab`)
- [ ] Cursor open with project loaded
- [ ] No version toggle visible (default state)
- [ ] Test one full simulation to ensure it works
- [ ] Browser window sized well for projector/screen share
- [ ] Audio/visuals clear if presenting remotely

---

## Troubleshooting

### Simulation not starting?
- Check that a persona is selected
- Refresh the page
- Check browser console for errors

### TKF not accumulating?
- Simulations are working if you see timeline events
- TKF only creates insights for confused/blocked/delighted steps
- Try running multiple personas to see patterns

### Hot-reload not working?
- Ensure Next.js dev server is running
- Check terminal for errors
- Try manually refreshing the Control Room
- Fall back to pressing `b` and using v2

### Cursor not making good changes?
- The prompt matters! Be specific: "implement these UX improvements to the v1 variant"
- You may need to guide it to specific elements
- Worst case: manually apply a few changes to show the concept

---

## Time Allocation (8-minute demo)

- **Act 1 - The Problem**: 2-3 min
- **Act 2 - TKF Export**: 1-2 min
- **Act 3 - AI Loop**: 3-4 min
- **Act 4 - Closing**: 1 min

Total: ~8 minutes with buffer for questions

---

## Final Tips

- **Practice the hot-reload flow** at least once before the demo
- **Have a backup plan**: if Cursor takes too long, press `b` and use v2
- **Tell the story**: judges care more about the vision than perfect execution
- **Emphasize the TKF**: it's the core innovation
- **Be honest**: "we pre-built v2 for demo reliability" is better than hiding it
- **Have fun**: this is a cool project, let your enthusiasm show!

🎉 Good luck with the hackathon!

