'use client';

import { SimulationStep } from '@/lib/types';
import { getPersonaById } from '@/lib/data/personas';

interface RunMetrics {
  confusionCount: number;
  blockedCount: number;
  delightCount: number;
  totalSteps: number;
  totalDurationMs: number;
  maxSeverity: number;
}

interface PersonaScorecardProps {
  currentSteps: SimulationStep[];
  baselineSteps?: SimulationStep[];
  maxSeverity: number;
  baselineMaxSeverity?: number;
}

function calculateMetrics(steps: SimulationStep[]): RunMetrics {
  if (steps.length === 0) {
    return {
      confusionCount: 0,
      blockedCount: 0,
      delightCount: 0,
      totalSteps: 0,
      totalDurationMs: 0,
      maxSeverity: 0,
    };
  }

  return {
    confusionCount: steps.filter(s => s.status === 'confused').length,
    blockedCount: steps.filter(s => s.status === 'blocked').length,
    delightCount: steps.filter(s => s.status === 'delighted').length,
    totalSteps: steps.length,
    totalDurationMs: steps.reduce((sum, s) => sum + (s.durationMs || 0), 0),
    maxSeverity: 0, // Will be passed from parent
  };
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function calculateChange(before: number, after: number): { percent: number; isImprovement: boolean } {
  if (before === 0) return { percent: 0, isImprovement: after === 0 };
  const percent = Math.round(((after - before) / before) * 100);
  // For confusion/blocked, negative is good; for delight, positive is good
  return { percent: Math.abs(percent), isImprovement: after < before };
}

export default function PersonaScorecard({
  currentSteps,
  baselineSteps,
  maxSeverity,
  baselineMaxSeverity,
}: PersonaScorecardProps) {
  const current = calculateMetrics(currentSteps);
  current.maxSeverity = maxSeverity;

  const baseline = baselineSteps ? calculateMetrics(baselineSteps) : null;
  if (baseline && baselineMaxSeverity !== undefined) {
    baseline.maxSeverity = baselineMaxSeverity;
  }

  const persona = currentSteps[0] ? getPersonaById(currentSteps[0].personaId) : null;
  const hasBaseline = baseline && baselineSteps && baselineSteps.length > 0;

  // Calculate experience score (0-100)
  const calculateScore = (metrics: RunMetrics): number => {
    const confusionPenalty = metrics.confusionCount * 5;
    const blockedPenalty = metrics.blockedCount * 10;
    const delightBonus = metrics.delightCount * 10;
    const severityPenalty = metrics.maxSeverity * 2;
    
    const score = 100 - confusionPenalty - blockedPenalty - severityPenalty + delightBonus;
    return Math.max(0, Math.min(100, score));
  };

  const currentScore = calculateScore(current);
  const baselineScore = baseline ? calculateScore(baseline) : null;

  if (!hasBaseline) {
    // Just show current metrics without comparison
    return (
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          {persona && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: persona.avatarColor }}
            >
              <span className="text-white font-bold text-sm">
                {persona.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold">{persona?.name} Experience</h3>
            <p className="text-xs text-foreground/60">Current run metrics</p>
          </div>
          <div className="ml-auto">
            <div className="text-2xl font-bold text-accent">{currentScore}</div>
            <div className="text-xs text-foreground/60 text-right">score</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-foreground/60 mb-1">Confused</div>
            <div className="text-lg font-semibold text-warning">{current.confusionCount}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/60 mb-1">Blocked</div>
            <div className="text-lg font-semibold text-error">{current.blockedCount}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/60 mb-1">Delighted</div>
            <div className="text-lg font-semibold text-success">{current.delightCount}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/60 mb-1">Steps</div>
            <div className="text-lg font-semibold">{current.totalSteps}</div>
          </div>
        </div>
      </div>
    );
  }

  // Show comparison
  const confusionChange = calculateChange(baseline.confusionCount, current.confusionCount);
  const delightChange = calculateChange(baseline.delightCount, current.delightCount);
  const scoreChange = currentScore - baselineScore!;

  return (
    <div className="bg-gradient-to-br from-surface to-surface-light border-2 border-accent/30 rounded-lg p-4 mb-4 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        {persona && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: persona.avatarColor }}
          >
            <span className="text-white font-bold text-sm">
              {persona.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold flex items-center gap-2">
            {persona?.name} Experience
            <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">
              Before vs After
            </span>
          </h3>
          <p className="text-xs text-foreground/60">Comparing baseline to current run</p>
        </div>
      </div>

      {/* Score comparison */}
      <div className="mb-4 p-3 bg-background rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-foreground/70">Experience Score</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/50">{baselineScore}</span>
            <span className="text-foreground/40">→</span>
            <span className="text-xl font-bold text-accent">{currentScore}</span>
            {scoreChange > 0 && (
              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded font-semibold">
                +{scoreChange}
              </span>
            )}
            {scoreChange < 0 && (
              <span className="text-xs px-2 py-0.5 bg-error/20 text-error rounded font-semibold">
                {scoreChange}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 h-2">
          <div
            className="bg-foreground/20 rounded-l"
            style={{ width: `${baselineScore}%` }}
          />
          <div
            className="bg-accent rounded-r"
            style={{ width: `${currentScore}%` }}
          />
        </div>
      </div>

      {/* Detailed metrics comparison */}
      <div className="space-y-2">
        {/* Confusion */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/70">Confusion moments</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground/50">{baseline.confusionCount}</span>
            <span className="text-foreground/40">→</span>
            <span className="font-semibold">{current.confusionCount}</span>
            {confusionChange.percent > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                confusionChange.isImprovement 
                  ? 'bg-success/20 text-success' 
                  : 'bg-error/20 text-error'
              }`}>
                {confusionChange.isImprovement ? '🔻' : '🔺'} {confusionChange.percent}%
              </span>
            )}
          </div>
        </div>

        {/* Blocked */}
        {(baseline.blockedCount > 0 || current.blockedCount > 0) && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">Blocked moments</span>
            <div className="flex items-center gap-2">
              <span className="text-foreground/50">{baseline.blockedCount}</span>
              <span className="text-foreground/40">→</span>
              <span className="font-semibold">{current.blockedCount}</span>
              {current.blockedCount === 0 && baseline.blockedCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded font-semibold">
                  ✅ Resolved
                </span>
              )}
            </div>
          </div>
        )}

        {/* Delight */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/70">Delight moments</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground/50">{baseline.delightCount}</span>
            <span className="text-foreground/40">→</span>
            <span className="font-semibold text-success">{current.delightCount}</span>
            {current.delightCount > baseline.delightCount && (
              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded font-semibold">
                🔺 +{current.delightCount - baseline.delightCount}
              </span>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/70">Total steps</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground/50">{baseline.totalSteps}</span>
            <span className="text-foreground/40">→</span>
            <span className="font-semibold">{current.totalSteps}</span>
            {current.totalSteps < baseline.totalSteps && (
              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded font-semibold">
                Faster
              </span>
            )}
          </div>
        </div>

        {/* Max severity */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/70">Max TKF severity</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground/50">{baseline.maxSeverity}/10</span>
            <span className="text-foreground/40">→</span>
            <span className="font-semibold">{current.maxSeverity}/10</span>
            {current.maxSeverity < baseline.maxSeverity && (
              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded font-semibold">
                🔻 Lower
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

