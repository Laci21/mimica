import { TKFInsight, SimulationStep } from '../types';
import { TKFUpdate } from '../types/tkf';
import { getPersonaById } from '../data/personas';

export function generateTKFReport(
  insights: TKFInsight[],
  allSteps: SimulationStep[],
  uiVersion: 'v1' | 'v2',
  backendTKF?: {
    fullContent: string;
    updates: TKFUpdate[];
  }
): string {
  const personas = Array.from(
    new Set(allSteps.map((s) => s.personaId))
  ).map((id) => getPersonaById(id)).filter(Boolean);

  const topInsights = insights.slice(0, 10); // Top 10 most severe

  let report = `# UX Testing Results - FocusFlow Onboarding (${uiVersion.toUpperCase()})\n\n`;
  
  report += `## Context\n\n`;
  report += `**Product**: FocusFlow - A productivity and focus management application\n\n`;
  report += `**Feature Tested**: User onboarding flow (${uiVersion === 'v1' ? 'current version' : 'improved version'})\n\n`;
  report += `**Test Date**: ${new Date().toLocaleDateString()}\n\n`;
  report += `**Total Interactions**: ${allSteps.length} steps across ${personas.length} persona${personas.length !== 1 ? 's' : ''}\n\n`;

  report += `---\n\n`;

  // Include Backend TKF if available
  if (backendTKF && backendTKF.fullContent) {
    report += `## Current Common Knowledge (TKF)\n\n`;
    report += `The Trusted Knowledge Fabric contains the following accumulated knowledge:\n\n`;
    report += `\`\`\`\n${backendTKF.fullContent}\n\`\`\`\n\n`;
    
    if (backendTKF.updates.length > 0) {
      report += `### Recent Knowledge Evolution\n\n`;
      report += `The TKF has evolved through ${backendTKF.updates.length} updates. Most recent changes:\n\n`;
      
      // Show last 5 updates
      backendTKF.updates.slice(-5).reverse().forEach((update, index) => {
        report += `**Update ${index + 1}** (${new Date(update.created_at).toLocaleString()})\n`;
        report += `- Reasoning: ${update.reasoning}\n`;
        report += `- Change: \`${update.old_text}\` → \`${update.new_text}\`\n`;
        if (Object.keys(update.metadata).length > 0) {
          report += `- Context: ${Object.entries(update.metadata).map(([k, v]) => `${k}=${v}`).join(', ')}\n`;
        }
        report += `\n`;
      });
    }
    
    report += `---\n\n`;
  }

  report += `## Tested Personas\n\n`;
  personas.forEach((persona) => {
    if (!persona) return;
    report += `### ${persona.name}\n`;
    report += `${persona.description}\n\n`;
    report += `**Goals**: ${persona.goals.join(', ')}\n\n`;
    report += `**Pain Points**: ${persona.painPoints.join(', ')}\n\n`;
  });

  report += `---\n\n`;

  report += `## Key Insights (${topInsights.length} issues identified)\n\n`;
  
  if (topInsights.length === 0) {
    report += `✅ No major issues detected! All personas completed the flow smoothly.\n\n`;
  } else {
    topInsights.forEach((insight, index) => {
      const affectedPersonas = insight.personaIds
        .map((id) => getPersonaById(id)?.name)
        .filter(Boolean)
        .join(', ');

      const severityLabel = 
        insight.severityScore >= 7 ? '🔴 HIGH' :
        insight.severityScore >= 4 ? '🟡 MEDIUM' :
        '🟢 LOW';

      report += `### ${index + 1}. ${insight.summary}\n\n`;
      report += `**Severity**: ${severityLabel} (${insight.severityScore}/10)\n\n`;
      report += `**Type**: ${insight.type}\n\n`;
      report += `**Tags**: ${insight.tags.join(', ')}\n\n`;
      report += `**Affected Personas**: ${affectedPersonas}\n\n`;
      report += `**Occurrences**: ${insight.evidence.length} times\n\n`;

      // Add sample reasoning
      const sampleSteps = insight.evidence.slice(0, 3).map((idx) => allSteps[idx]).filter(Boolean);
      if (sampleSteps.length > 0) {
        report += `**Sample User Feedback**:\n`;
        sampleSteps.forEach((step) => {
          const persona = getPersonaById(step.personaId);
          report += `- ${persona?.name}: "${step.reasoningText}"\n`;
        });
        report += `\n`;
      }
    });
  }

  report += `---\n\n`;

  report += `## Recommended UI Changes\n\n`;
  
  if (topInsights.length === 0) {
    report += `No critical changes required. Consider minor refinements based on user preferences.\n\n`;
  } else {
    // Group by element and provide concrete recommendations
    const elementInsights = new Map<string, TKFInsight[]>();
    topInsights.forEach((insight) => {
      insight.elementIds.forEach((elementId) => {
        if (!elementInsights.has(elementId)) {
          elementInsights.set(elementId, []);
        }
        elementInsights.get(elementId)!.push(insight);
      });
    });

    let changeIndex = 1;
    elementInsights.forEach((insights, elementId) => {
      const primaryInsight = insights[0];
      report += `### Change ${changeIndex}: \`${elementId}\`\n\n`;
      
      // Generate specific recommendations based on tags
      if (primaryInsight.tags.includes('copy-clarity')) {
        report += `**Issue**: Unclear or confusing copy\n\n`;
        report += `**Recommendation**: Simplify language and use concrete, user-friendly terms. `;
        report += `Replace technical jargon with plain language that clearly describes what the option does.\n\n`;
        report += `**Specific Action**: \n`;
        report += `- Review the label and description for "${elementId.replace(/-/g, ' ')}"\n`;
        report += `- Use action-oriented, benefit-focused copy\n`;
        report += `- Add helper text or tooltips to clarify purpose\n\n`;
      }
      
      if (primaryInsight.tags.includes('visual-hierarchy')) {
        report += `**Issue**: Primary action not visually prominent\n\n`;
        report += `**Recommendation**: Improve visual hierarchy to make the main action clear\n\n`;
        report += `**Specific Action**: \n`;
        report += `- Make the primary CTA button more prominent (larger, brighter color)\n`;
        report += `- Reduce visual weight of secondary actions\n`;
        report += `- Ensure consistent button placement (e.g., primary action always on right)\n\n`;
      }

      if (primaryInsight.tags.includes('navigation')) {
        report += `**Issue**: Navigation flow is confusing\n\n`;
        report += `**Recommendation**: Clarify navigation patterns and button labels\n\n`;
        report += `**Specific Action**: \n`;
        report += `- Use consistent "Back" / "Next" or "Previous" / "Continue" labels\n`;
        report += `- Make forward-navigation buttons more prominent than backward ones\n`;
        report += `- Add visual progress indicators\n\n`;
      }

      if (primaryInsight.tags.includes('information-overload')) {
        report += `**Issue**: Too much information or too many choices\n\n`;
        report += `**Recommendation**: Reduce cognitive load\n\n`;
        report += `**Specific Action**: \n`;
        report += `- Break complex screens into smaller steps\n`;
        report += `- Show only essential options, hide advanced settings\n`;
        report += `- Use progressive disclosure\n\n`;
      }

      changeIndex++;
    });
  }

  report += `---\n\n`;

  report += `## Implementation Notes for Coding Agent\n\n`;
  report += `**Component to modify**: \`components/onboarding/OnboardingFlow.tsx\`\n\n`;
  report += `**Focus areas**:\n`;
  report += `1. Update copy and labels for clarity\n`;
  report += `2. Improve visual hierarchy (button styling, prominence)\n`;
  report += `3. Add helper text where users showed confusion\n`;
  report += `4. Standardize navigation button placement and labels\n`;
  report += `5. Consider reducing options per screen if information overload detected\n\n`;
  
  report += `**Testing**: After changes, re-run the same personas in Mimica to validate improvements.\n\n`;

  return report;
}

