/**
 * Claude AI coach implementation.
 * Wired at CLI/MCP entry points. Never imported by services directly.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CoachFn, CoachInput, CoachOutput } from './coach.js';
import { CoachResponseSchema } from './schemas.js';

const BASE_SYSTEM = `You are a personal coach for a progressive training application. Your role is to analyze the athlete's context before a session and provide brief, actionable coaching advice.

Respond with valid JSON matching this schema:
{
  "narrative": "string — 2-4 sentences of coaching advice",
  "adjustments": [
    {
      "activityId": "string",
      "field": "weight | reps | sets | skip",
      "originalValue": null,
      "adjustedValue": null,
      "rationale": "string"
    }
  ],
  "confidence": "high | medium | low"
}

Keep narrative concise and direct. Only include adjustments when context clearly warrants them.
If context is absent or normal, return empty adjustments array and high confidence.`;

export function createClaudeCoach(apiKey?: string): CoachFn {
  const client = new Anthropic({ apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'] });

  return async (input: CoachInput): Promise<CoachOutput> => {
    const systemPrompt = buildSystemPrompt(input);
    const userContent = buildContextBlock(input);

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
      const jsonText = (jsonMatch[1] ?? text).trim();

      const parsed = CoachResponseSchema.safeParse(JSON.parse(jsonText));
      if (parsed.success) {
        return parsed.data;
      }

      // Fallback: return narrative without structured adjustments
      return {
        narrative: text.slice(0, 500),
        adjustments: [],
        confidence: 'low',
      };
    } catch (error) {
      // AI failures are non-fatal — return empty coaching note
      console.error('[coach] AI call failed:', error instanceof Error ? error.message : error);
      return {
        narrative: '',
        adjustments: [],
        confidence: 'low',
      };
    }
  };
}

function buildSystemPrompt(input: CoachInput): string {
  // The domain module provides a domain-specific fragment prepended to the base
  return BASE_SYSTEM;
}

function buildContextBlock(input: CoachInput): string {
  const parts: string[] = [];

  parts.push(`Program: ${input.program.name} (${input.program.domain})`);
  parts.push(`Goal: ${input.program.goalStatement}`);
  parts.push(`Today's session: ${input.currentSession.label}`);
  parts.push(`Session activities: ${input.currentSession.activities.map((a) => a.name).join(', ')}`);

  if (input.context) {
    const { energyLevel, painPoints, timeConstraintMinutes, additionalNotes } = input.context;
    parts.push(`\nPre-session context:`);
    parts.push(`  Energy: ${energyLevel}/5`);
    if (painPoints.length > 0) {
      parts.push(`  Pain/discomfort: ${painPoints.map((p) => `${p.area} (severity ${p.severity}/3)`).join(', ')}`);
    }
    if (timeConstraintMinutes) {
      parts.push(`  Time available: ${timeConstraintMinutes} minutes`);
    }
    if (additionalNotes) {
      parts.push(`  Notes: ${additionalNotes}`);
    }
  }

  if (Object.keys(input.domainContext).length > 0) {
    parts.push(`\nDomain context: ${JSON.stringify(input.domainContext, null, 2)}`);
  }

  if (input.recentHistory.length > 0) {
    parts.push(`\nRecent sessions (last ${input.recentHistory.length}):`);
    for (const session of input.recentHistory) {
      const date = session.completedAt?.toLocaleDateString() ?? 'unknown';
      parts.push(`  ${date}: ${session.summary}`);
    }
  }

  if (input.userMessage) {
    parts.push(`\nAthlete question: ${input.userMessage}`);
  }

  return parts.join('\n');
}
