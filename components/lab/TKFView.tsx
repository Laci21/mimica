'use client';

import { TKFInsight, InsightTag } from '@/lib/types';
import { getPersonaById } from '@/lib/data/personas';
import { personas } from '@/lib/data/personas';
import { humanizeElementId } from '@/lib/utils/elementLabels';

interface TKFViewProps {
  insights: TKFInsight[];
}

const tagColors: Record<InsightTag, string> = {
  'copy-clarity': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'navigation': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'visual-hierarchy': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'interaction-design': 'bg-green-500/20 text-green-300 border-green-500/30',
  'information-overload': 'bg-red-500/20 text-red-300 border-red-500/30',
  'missing-guidance': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'positive-experience': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const typeEmoji: Record<string, string> = {
  confusion: '🤔',
  friction: '🚫',
  delight: '✨',
  opportunity: '💡',
};

export default function TKFView({ insights }: TKFViewProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/40">
        <div className="text-4xl mb-4">🧵</div>
        <p>No insights yet.</p>
        <p className="text-sm mt-2">The Knowledge Fabric will weave as personas interact.</p>
      </div>
    );
  }

  // Group insights by persona
  const insightsByPersona = insights.reduce((acc, insight) => {
    insight.personaIds.forEach((personaId: string) => {
      if (!acc[personaId]) acc[personaId] = [];
      acc[personaId].push(insight);
    });
    return acc;
  }, {} as Record<string, TKFInsight[]>);

  // Ensure all personas have a lane even if empty
  const personaLanes = personas.map(persona => ({
    persona,
    insights: insightsByPersona[persona.id] || [],
  }));

  return (
    <div className="relative">
      {/* Fabric Background Lanes */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="grid grid-cols-3 gap-6 h-full">
          {personaLanes.map((lane, idx) => (
            <div
              key={lane.persona.id}
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: `linear-gradient(to bottom, ${lane.persona.avatarColor}15 0%, ${lane.persona.avatarColor}25 50%, transparent 100%)`,
                animationDelay: `${idx * 0.5}s`,
              }}
            >
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 animate-fabric-shimmer"
                style={{
                  background: `radial-gradient(ellipse at top, ${lane.persona.avatarColor}30, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lane Labels */}
      <div className="relative grid grid-cols-3 gap-6 mb-4">
        {personaLanes.map((lane) => (
          <div key={lane.persona.id} className="text-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm"
              style={{
                backgroundColor: `${lane.persona.avatarColor}20`,
                borderColor: `${lane.persona.avatarColor}40`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: lane.persona.avatarColor }}
              >
                {lane.persona.name.charAt(0)}
              </div>
              <span className="text-xs font-medium">{lane.persona.name.split(' ')[0]}</span>
              <span className="text-xs text-foreground/50">
                ({lane.insights.length})
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Insight Cards in Lanes */}
      <div className="relative grid grid-cols-3 gap-6">
        {personaLanes.map((lane) => (
          <div key={lane.persona.id} className="space-y-3">
            {lane.insights.map((insight, idx) => {
              const isResolved = insight.resolved;
              const severityColor = 
                insight.severityScore >= 8 
                  ? 'border-error/50 bg-error/5'
                  : insight.severityScore >= 5
                  ? 'border-warning/50 bg-warning/5'
                  : 'border-success/50 bg-success/5';

              const resolvedStyle = isResolved
                ? 'border-success/30 bg-success/5 opacity-60'
                : severityColor;

              return (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border backdrop-blur-sm transition-all duration-300 animate-insight-pop ${resolvedStyle}`}
                  style={{
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg flex-shrink-0">
                      {isResolved ? '✅' : typeEmoji[insight.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground/90 truncate">
                        {humanizeElementId(insight.elementIds[0] || 'unknown')}
                      </div>
                      {isResolved && insight.previousSeverity && (
                        <div className="text-xs text-success font-medium flex items-center gap-1 mt-1">
                          <span>{insight.previousSeverity}</span>
                          <span>→</span>
                          <span>{insight.severityScore}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-0.5 h-3 rounded-full ${
                              isResolved
                                ? i < insight.severityScore
                                  ? 'bg-success/30'
                                  : 'bg-surface-light/30'
                                : i < insight.severityScore
                                ? insight.severityScore >= 8
                                  ? 'bg-error'
                                  : insight.severityScore >= 5
                                  ? 'bg-warning'
                                  : 'bg-success'
                                : 'bg-surface-light'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-foreground/70 mb-2 line-clamp-2">
                    {insight.summary}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(insight.tags)).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${tagColors[tag]}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Evidence count badge */}
                  {insight.evidence.length > 1 && (
                    <div className="text-[10px] text-foreground/50 mt-2 text-right">
                      ×{insight.evidence.length}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
