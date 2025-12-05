/**
 * Convert technical element IDs to user-friendly labels for TKF display
 */
export function humanizeElementId(elementId: string): string {
  // Common patterns
  const patterns: Record<string, string> = {
    // Goals
    'goal-option-maximize': '💼 Maximize Output',
    'goal-option-optimize': '⚙️ Optimize Workflow',
    'goal-option-balance': '⚖️ Balance Work & Life',
    'goal-option-balance-v2': '⚖️ Balance Work & Life',
    
    // Engagement/Guidance
    'engagement-intensity-slider': '🎚️ Guidance Level Slider',
    'engagement-adaptive-toggle': '🔄 Smart Adjustments Toggle',
    'guidance-level-slider-v2': '🎚️ Guidance Level Slider',
    
    // Notifications
    'notification-updates': '🔔 Product Updates',
    'notification-tips': '💡 Tips & Tricks',
    'notification-reminders': '⏰ Reminders',
    'notification-updates-v2': '🔔 Product Updates',
    'notification-tips-v2': '💡 Tips & Tricks',
    
    // Navigation
    'step0-continue': '➡️ Continue Button (Step 1)',
    'step1-continue': '➡️ Next Button (Step 2)',
    'step2-skip': '⏭️ Skip Button (Step 3)',
    'step2-back': '⬅️ Back Button',
    'step3-finish': '✅ Finish Button',
    'step0-continue-v2': '➡️ Continue Button (Step 1)',
    'step1-continue-v2': '➡️ Next Button (Step 2)',
    'step2-skip-v2': '⏭️ Skip Button (Step 3)',
    'step3-finish-v2': '✅ Finish Button',
  };

  // Try exact match first
  if (patterns[elementId]) {
    return patterns[elementId];
  }

  // Fallback: convert kebab-case to Title Case with emoji prefix
  const humanized = elementId
    .replace(/-v2$/, '') // remove v2 suffix
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Add emoji based on type
  if (elementId.includes('button') || elementId.includes('continue') || elementId.includes('next')) {
    return `🔘 ${humanized}`;
  }
  if (elementId.includes('notification')) {
    return `🔔 ${humanized}`;
  }
  if (elementId.includes('goal')) {
    return `🎯 ${humanized}`;
  }
  if (elementId.includes('slider') || elementId.includes('toggle')) {
    return `🎛️ ${humanized}`;
  }

  return `📍 ${humanized}`;
}

/**
 * Get a short version (without emoji) for compact displays
 */
export function humanizeElementIdShort(elementId: string): string {
  return humanizeElementId(elementId).replace(/^[^\s]+\s/, '');
}

