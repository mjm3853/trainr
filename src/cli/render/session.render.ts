/**
 * Session display renderer — human-readable terminal output.
 */

import type { PlannedSession } from '../../services/session.service.js';
import type { DomainModule } from '../../core/domain.js';
import type { CoachingNote, SessionRecord } from '../../core/schemas.js';

export function renderPlannedSession(
  plan: PlannedSession,
  domain: DomainModule,
): string {
  const lines: string[] = [];
  const { session, resolvedTargets, coachingNote } = plan;

  lines.push(`\n━━━ ${session.session.label} ━━━`);
  lines.push(`${session.cycle.label}  |  Est. ${session.session.estimatedDuration} min`);

  if (session.session.notes) {
    lines.push(`\n${session.session.notes}`);
  }

  if (coachingNote) {
    lines.push(`\n💬 Coach: ${coachingNote.content}`);
    if (coachingNote.adjustments.length > 0) {
      lines.push(`\nAdjustments:`);
      for (const adj of coachingNote.adjustments) {
        lines.push(`  • ${adj.activityId}: ${adj.rationale}`);
      }
    }
  }

  lines.push(`\nActivities:`);
  session.session.activities.forEach((activity, i) => {
    const target = resolvedTargets[i];
    if (!target) return;
    const targetStr = domain.formatActivityTarget(activity, target);
    lines.push(`  ${i + 1}. ${activity.name}`);
    lines.push(`     ${targetStr}`);
  });

  return lines.join('\n');
}

export function renderSessionRecord(
  record: SessionRecord,
  notes: CoachingNote[],
  domain: DomainModule,
): string {
  const lines: string[] = [];
  const date = record.completedAt?.toLocaleDateString() ?? 'Skipped';

  lines.push(`\n━━━ Session ${record.id.slice(0, 8)} ━━━`);
  lines.push(`Date: ${date}`);

  if (record.skipped) {
    lines.push(`Status: Skipped${record.skipReason ? ` — ${record.skipReason}` : ''}`);
    return lines.join('\n');
  }

  if (record.durationMinutes) {
    lines.push(`Duration: ${record.durationMinutes} min`);
  }

  if (record.context) {
    const { energyLevel, painPoints, additionalNotes } = record.context;
    lines.push(`Energy: ${energyLevel}/5`);
    if (painPoints.length > 0) {
      lines.push(`Pain: ${painPoints.map((p) => p.area).join(', ')}`);
    }
    if (additionalNotes) lines.push(`Notes: ${additionalNotes}`);
  }

  const preNote = notes.find((n) => n.phase === 'pre');
  if (preNote) {
    lines.push(`\nCoach (pre): ${preNote.content}`);
  }

  if (record.activities.length > 0) {
    lines.push(`\nActivities:`);
    for (const activity of record.activities) {
      const completed = activity.sets.filter((s) => s.completed);
      if (completed.length === 0) continue;
      const summary = completed
        .map((s) => {
          if (s.value.kind === 'load_reps') return `${s.value.reps}×${s.value.weight}${s.value.unit}`;
          return JSON.stringify(s.value);
        })
        .join(', ');
      lines.push(`  ${activity.templateId}: ${summary}${activity.rpe ? ` @ RPE ${activity.rpe}` : ''}`);
    }
  }

  if (record.userNotes) {
    lines.push(`\n"${record.userNotes}"`);
  }

  return lines.join('\n');
}
