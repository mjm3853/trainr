/**
 * Session display renderer — human-readable terminal output.
 */

import type { PlannedSession } from '../../services/session.service.js';
import type { DomainModule } from '../../core/domain.js';
import type { CoachingNote, SessionRecord } from '../../core/schemas.js';
import { dim, accent, warn, bold, success, S, box, boxLine, boxStart, boxEnd, energyBar } from './theme.js';

export function renderPlannedSession(
  plan: PlannedSession,
  domain: DomainModule,
): string {
  const { session, resolvedTargets, coachingNote } = plan;

  const lines: (string | null)[] = [];

  lines.push(dim(`${session.cycle.label}  ${S.DOT}  ${session.session.estimatedDuration} min`));

  if (session.session.notes) {
    lines.push(null);
    lines.push(dim(session.session.notes));
  }

  if (coachingNote) {
    lines.push(null);
    lines.push(`${dim('💬')}  ${coachingNote.content}`);
    if (coachingNote.adjustments.length > 0) {
      lines.push(null);
      lines.push(bold('Adjustments'));
      for (const adj of coachingNote.adjustments) {
        lines.push(`  ${accent(S.ARROW)} ${bold(adj.activityId)} ${dim('—')} ${adj.rationale}`);
      }
    }
  }

  lines.push(null);
  session.session.activities.forEach((activity, i) => {
    const target = resolvedTargets[i];
    if (!target) return;
    const targetStr = domain.formatActivityTarget(activity, target);
    lines.push(`${accent(S.BULLET)}  ${bold(activity.name)}`);
    lines.push(`   ${dim(targetStr)}`);
    if (i < session.session.activities.length - 1) lines.push(null);
  });

  return '\n' + box(session.session.label, lines);
}

export function renderSessionRecord(
  record: SessionRecord,
  notes: CoachingNote[],
  _domain: DomainModule,
): string {
  const out: string[] = [];

  const date = record.completedAt
    ? record.completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Skipped';

  out.push(boxStart(`Session ${dim(record.id.slice(0, 8))}`) + `   ${dim(date)}`);
  out.push(boxLine());

  if (record.skipped) {
    out.push(boxLine(`${warn(S.BULLET_OPEN)}  ${warn('Skipped')}${record.skipReason ? `  ${dim('—')}  ${dim(record.skipReason)}` : ''}`));
    out.push(boxLine());
    out.push(boxEnd());
    return '\n' + out.join('\n');
  }

  const meta: string[] = [];
  if (record.durationMinutes) {
    meta.push(`${dim('Duration')}  ${record.durationMinutes} min`);
  }
  if (record.context) {
    meta.push(`${dim('Energy')}  ${energyBar(record.context.energyLevel)}  ${dim(`${record.context.energyLevel}/5`)}`);
  }
  if (meta.length > 0) {
    out.push(boxLine(meta.join('   ')));
  }

  if (record.context?.painPoints.length) {
    out.push(boxLine(warn(`Pain: ${record.context.painPoints.map((p) => p.area).join(', ')}`)));
  }

  const preNote = notes.find((n) => n.phase === 'pre');
  if (preNote) {
    out.push(boxLine());
    out.push(boxLine(`${dim('💬')}  ${preNote.content}`));
  }

  if (record.activities.length > 0) {
    out.push(boxLine());
    for (const activity of record.activities) {
      const completed = activity.sets.filter((s) => s.completed);
      if (completed.length === 0) continue;
      const summary = completed
        .map((s) => {
          if (s.value.kind === 'load_reps') return `${s.value.reps}×${s.value.weight}${s.value.unit}`;
          return JSON.stringify(s.value);
        })
        .join(', ');
      const rpe = activity.rpe ? `   ${dim(`RPE ${activity.rpe}`)}` : '';
      out.push(boxLine(`${success(S.BULLET)}  ${bold(activity.templateId)}  ${dim(summary)}${rpe}`));
    }
  }

  if (record.userNotes) {
    out.push(boxLine());
    out.push(boxLine(dim(`"${record.userNotes}"`)));
  }

  if (record.context?.additionalNotes) {
    out.push(boxLine());
    out.push(boxLine(dim(record.context.additionalNotes)));
  }

  out.push(boxLine());
  out.push(boxEnd());
  return '\n' + out.join('\n');
}
