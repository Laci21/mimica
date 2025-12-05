# Mimica Demo Quick Reference Card

**Print this or keep it visible during your demo!**

---

## 🎯 The Core Message

**Mimica = AI Personas + UX Testing + TKF + Coding Agents**

Close the loop: Test → Insights → Code → Re-test

---

## 🚀 Demo Flow (8 minutes)

### 1. Show the Problem (2 min)
- Open `/lab`
- Select persona: **Raj Patel**
- Click **"Run Simulation"**
- Watch: highlighting, reasoning, TKF tiles appear
- Run 1-2 more personas (optional)

### 2. Export TKF (1 min)
- Click **"Export TKF to Coding Agent"**
- Show the Markdown report
- Click **"Copy for Cursor"**

### 3. AI Improves UI (3-4 min)
**PRIMARY PATH (Hot-Reload):**
- Switch to Cursor
- Open `components/onboarding/OnboardingFlow.tsx`
- Cmd/Ctrl + L (open chat)
- Paste + "implement these UX improvements to v1"
- Accept changes
- **Save file**
- Return to Mimica → see auto-updated preview
- Re-run personas → show improvement

**BACKUP PATH (if needed):**
- Press **`b`** in Control Room
- Toggle shows up
- Click **v2**
- Re-run personas

### 4. Closing (1 min)
- TKF = structured knowledge
- Continuous improvement loop
- Works with any UI/any coding agent

---

## ⌨️ Emergency Shortcuts

| Key | Action |
|-----|--------|
| `b` | Toggle backup version switcher |

---

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| Simulation won't start | Select a persona, refresh page |
| Hot-reload not working | Save again, refresh page, or press `b` → v2 |
| Cursor taking too long | Press `b` → use v2 backup |
| TKF not showing | Only creates insights for confused/blocked steps |

---

## 💬 Key Talking Points

✅ **AI personas are better than real users for rapid iteration**
✅ **TKF = Trusted Knowledge Fabric (not just logs!)**
✅ **Real hot-reload = true AI-augmented dev workflow**
✅ **Pre-built v2 = demo safety (be honest about it)**

---

## 📋 Pre-Demo Checklist

- [ ] `npm run dev` running
- [ ] `/lab` loaded
- [ ] Cursor open with project
- [ ] Test one simulation
- [ ] Version toggle hidden (default)
- [ ] Screen share ready

---

## 🎭 Demo Personas

1. **Raj Patel** - Non-native speaker, careful, struggles with jargon
2. **Alex Chen** - Gen Z creator, impatient, wants speed
3. **Maria Rodriguez** - Busy parent, needs clarity and reassurance

---

## 🎬 Opening Line

"Have you ever wondered how different users actually experience your UI? Meet Mimica - AI personas that test your app in real-time and build a knowledge fabric that feeds directly into your coding agent."

---

## 🏁 Closing Line

"And that's Mimica - from AI personas to production-ready code in one continuous loop. The TKF keeps getting smarter with every test, and your UI keeps getting better. Questions?"

---

**Good luck! 🚀**

