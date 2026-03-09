/**
 * Workout domain formatters — human-readable display of targets and records.
 */

import type { ActivityTemplate, ActivityTarget, ActivityRecord, ActivitySet } from '../../core/schemas.js';

export function formatActivityTarget(template: ActivityTemplate, target: ActivityTarget): string {
  const { planned, sets, note } = target;

  if (planned.kind === 'load_reps') {
    const setsStr = sets ? `${sets}×` : '';
    return `${setsStr}${planned.reps} reps @ ${planned.weight} ${planned.unit}${note ? `\n    ${note}` : ''}`;
  }

  if (planned.kind === 'reps_only') {
    const setsStr = sets ? `${sets}×` : '';
    return `${setsStr}${planned.reps} reps`;
  }

  if (planned.kind === 'duration') {
    return `${planned.value} ${planned.unit}`;
  }

  if (planned.kind === 'rating') {
    return `Rate 1–${template.metric.kind === 'rating' ? template.metric.scale : 10}`;
  }

  if (planned.kind === 'count') {
    return `${planned.count} ${template.metric.kind === 'count' ? template.metric.label : 'reps'}`;
  }

  if (planned.kind === 'completion') {
    return 'Complete';
  }

  return 'Unknown target';
}

export function formatActivityRecord(template: ActivityTemplate, record: ActivityRecord): string {
  const completedSets = record.sets.filter((s) => s.completed);

  if (completedSets.length === 0) return `${template.name}: — (no sets completed)`;

  const setStrings = completedSets.map((s) => formatSetValue(s));
  const rpeStr = record.rpe ? ` @ RPE ${record.rpe}` : '';

  return `${template.name}: ${setStrings.join(', ')}${rpeStr}`;
}

function formatSetValue(set: ActivitySet): string {
  const { value } = set;
  if (value.kind === 'load_reps') return `${value.reps}×${value.weight}${value.unit}`;
  if (value.kind === 'reps_only') return `${value.reps}`;
  if (value.kind === 'duration') return `${value.value}${value.unit}`;
  if (value.kind === 'rating') return `${value.score}/10`;
  if (value.kind === 'count') return `${value.count}`;
  if (value.kind === 'completion') return value.completed ? '✓' : '✗';
  return '?';
}

export function summarizeSession(
  activities: Array<{ template: ActivityTemplate; record: ActivityRecord }>,
): string {
  return activities
    .filter(({ record }) => record.sets.some((s) => s.completed))
    .map(({ template, record }) => {
      const topSet = record.sets
        .filter((s) => s.completed && s.value.kind === 'load_reps')
        .sort((a, b) => {
          if (a.value.kind !== 'load_reps' || b.value.kind !== 'load_reps') return 0;
          return b.value.weight - a.value.weight;
        })
        .at(0);

      if (topSet && topSet.value.kind === 'load_reps') {
        const reps = record.sets.filter((s) => s.completed).map((s) => s.value.kind === 'load_reps' ? s.value.reps : 0).join('/');
        return `${template.name} ${reps}@${topSet.value.weight}${topSet.value.unit}`;
      }

      return formatActivityRecord(template, record);
    })
    .join(' | ');
}
