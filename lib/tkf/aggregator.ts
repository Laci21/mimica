import { SimulationStep, TKFInsight, InsightType, InsightTag } from '../types';

export class TKFAggregator {
  private insights: Map<string, TKFInsight> = new Map();
  private nextId = 1;
  private baselineInsights: Map<string, TKFInsight> = new Map();

  public processStep(step: SimulationStep): TKFInsight | null {
    // Only create insights from confused, blocked, or delighted steps
    if (step.status === 'success') {
      return null;
    }

    // Determine insight type and tags based on step data
    const { type, tags } = this.analyzeStep(step);

    // Create a key for grouping similar insights
    const key = `${step.targetElementId}-${type}`;

    let insight = this.insights.get(key);

    if (insight) {
      // Update existing insight
      if (!insight.personaIds.includes(step.personaId)) {
        insight.personaIds.push(step.personaId);
      }
      insight.evidence.push(step.stepIndex);
      insight.severityScore = this.calculateSeverity(insight);
    } else {
      // Create new insight
      insight = {
        id: `insight-${this.nextId++}`,
        type,
        personaIds: [step.personaId],
        elementIds: [step.targetElementId],
        tags,
        summary: this.generateSummary(step, type),
        evidence: [step.stepIndex],
        severityScore: 3, // Initial score
        createdAt: Date.now(),
      };
      this.insights.set(key, insight);
    }

    return insight;
  }

  private analyzeStep(step: SimulationStep): { type: InsightType; tags: InsightTag[] } {
    const reasoning = step.reasoningText.toLowerCase();
    
    let type: InsightType = 'confusion';
    const tags: InsightTag[] = [];

    if (step.status === 'delighted') {
      type = 'delight';
      tags.push('positive-experience');
    } else if (step.status === 'blocked') {
      type = 'friction';
    } else if (step.status === 'confused') {
      type = 'confusion';
    }

    // Analyze reasoning text for tags
    if (reasoning.includes('what') || reasoning.includes('mean') || reasoning.includes('unclear')) {
      tags.push('copy-clarity');
    }
    if (reasoning.includes('button') || reasoning.includes('click') || reasoning.includes('find')) {
      tags.push('visual-hierarchy');
    }
    if (reasoning.includes('similar') || reasoning.includes('same')) {
      tags.push('copy-clarity');
    }
    if (reasoning.includes('too many') || reasoning.includes('overload')) {
      tags.push('information-overload');
    }
    if (reasoning.includes('back') || reasoning.includes('went')) {
      tags.push('navigation');
    }
    if (reasoning.includes('not sure') || reasoning.includes('don\'t know')) {
      tags.push('missing-guidance');
    }
    if (reasoning.includes('interaction') || reasoning.includes('paradigm') || reasoning.includes('mode')) {
      tags.push('copy-clarity');
    }

    // Default tag if none matched
    if (tags.length === 0) {
      tags.push('interaction-design');
    }

    return { type, tags };
  }

  private generateSummary(step: SimulationStep, type: InsightType): string {
    const element = step.targetElementId.replace(/-/g, ' ');
    
    if (type === 'confusion') {
      return `User confused by "${element}"`;
    } else if (type === 'friction') {
      return `User blocked at "${element}"`;
    } else if (type === 'delight') {
      return `User enjoyed "${element}"`;
    } else {
      return `Opportunity at "${element}"`;
    }
  }

  private calculateSeverity(insight: TKFInsight): number {
    // More personas = higher severity
    // More evidence = higher severity
    const personaMultiplier = insight.personaIds.length;
    const evidenceMultiplier = Math.min(insight.evidence.length, 5);
    
    let baseSeverity = 3;
    if (insight.type === 'blocked' || insight.type === 'friction') {
      baseSeverity = 7;
    } else if (insight.type === 'confusion') {
      baseSeverity = 5;
    } else if (insight.type === 'delight') {
      baseSeverity = 2;
    }

    const severity = baseSeverity + personaMultiplier + evidenceMultiplier;
    return Math.min(severity, 10);
  }

  public getInsights(): TKFInsight[] {
    return Array.from(this.insights.values()).sort((a, b) => b.severityScore - a.severityScore);
  }

  public getInsightCount(): number {
    return this.insights.size;
  }

  public clear() {
    this.insights.clear();
    this.nextId = 1;
  }

  public setBaseline() {
    this.baselineInsights = new Map(this.insights);
  }

  public markResolvedInsights() {
    // Compare current insights with baseline
    this.baselineInsights.forEach((baselineInsight, key) => {
      const currentInsight = this.insights.get(key);
      
      if (!currentInsight) {
        // Insight no longer exists - it's resolved!
        const resolvedInsight = { ...baselineInsight, resolved: true };
        this.insights.set(key, resolvedInsight);
      } else if (currentInsight.severityScore < baselineInsight.severityScore) {
        // Severity decreased - mark improvement
        currentInsight.previousSeverity = baselineInsight.severityScore;
      }
    });
  }
}

