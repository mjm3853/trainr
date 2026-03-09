/**
 * Per-activity logging prompts.
 */

import * as p from '@clack/prompts';
import type { ActivityTemplate, ActivityTarget, ActivityRecord, ActivitySet } from '../../core/schemas.js';
import type { DomainModule } from '../../core/domain.js';

export async function logActivity(
  template: ActivityTemplate,
  target: ActivityTarget,
  domain: DomainModule,
): Promise<ActivityRecord | null> {
  const targetDisplay = domain.formatActivityTarget(template, target);

  p.log.step(`${template.name}`);
  p.log.info(`Target: ${targetDisplay}`);

  const sets: ActivitySet[] = [];
  const setCount = target.sets ?? 1;

  for (let i = 0; i < setCount; i++) {
    const setLabel = setCount > 1 ? `Set ${i + 1} of ${setCount}` : 'Result';

    if (template.metric.kind === 'load_reps') {
      const weight = await p.text({
        message: `${setLabel} — weight (${template.metric.unit})?`,
        placeholder: String(target.planned.kind === 'load_reps' ? target.planned.weight : ''),
        validate: (v) => {
          const n = parseFloat(v);
          if (isNaN(n) || n <= 0) return 'Enter a positive number';
        },
      });
      if (p.isCancel(weight)) return null;

      const reps = await p.text({
        message: `${setLabel} — reps completed?`,
        placeholder: String(target.planned.kind === 'load_reps' ? target.planned.reps : ''),
        validate: (v) => {
          const n = parseInt(v, 10);
          if (isNaN(n) || n < 0) return 'Enter 0 or more reps';
        },
      });
      if (p.isCancel(reps)) return null;

      const repsNum = parseInt(reps as string, 10);
      sets.push({
        ordinal: i,
        value: {
          kind: 'load_reps',
          weight: parseFloat(weight as string),
          reps: repsNum,
          unit: template.metric.unit,
        },
        completed: repsNum > 0,
        note: null,
      });
    } else if (template.metric.kind === 'completion') {
      const done = await p.confirm({ message: `${setLabel} — completed?` });
      if (p.isCancel(done)) return null;
      sets.push({
        ordinal: i,
        value: { kind: 'completion', completed: done as boolean },
        completed: done as boolean,
        note: null,
      });
    } else if (template.metric.kind === 'rating') {
      const score = await p.text({
        message: `${setLabel} — rating (1–${template.metric.scale})?`,
        validate: (v) => {
          const n = parseFloat(v);
          const scale = template.metric.kind === 'rating' ? template.metric.scale : 10;
          if (isNaN(n) || n < 1 || n > scale) return `Enter 1–${scale}`;
        },
      });
      if (p.isCancel(score)) return null;
      sets.push({
        ordinal: i,
        value: { kind: 'rating', score: parseFloat(score as string) },
        completed: true,
        note: null,
      });
    } else if (template.metric.kind === 'count') {
      const count = await p.text({
        message: `${setLabel} — ${template.metric.label}?`,
        validate: (v) => {
          const n = parseInt(v, 10);
          if (isNaN(n) || n < 0) return 'Enter 0 or more';
        },
      });
      if (p.isCancel(count)) return null;
      sets.push({
        ordinal: i,
        value: { kind: 'count', count: parseInt(count as string, 10) },
        completed: parseInt(count as string, 10) > 0,
        note: null,
      });
    } else {
      // duration, reps_only — simplified
      const val = await p.text({
        message: `${setLabel} — value?`,
      });
      if (p.isCancel(val)) return null;
      sets.push({
        ordinal: i,
        value: template.metric.kind === 'reps_only'
          ? { kind: 'reps_only', reps: parseInt(val as string, 10) || 0 }
          : { kind: 'duration', value: parseFloat(val as string) || 0, unit: template.metric.unit },
        completed: true,
        note: null,
      });
    }
  }

  const rpeStr = await p.text({
    message: 'RPE (1–10)? Optional — press Enter to skip',
    placeholder: '',
    validate: (v) => {
      if (!v) return;
      const n = parseFloat(v);
      if (isNaN(n) || n < 1 || n > 10) return 'Enter 1–10 or leave blank';
    },
  });
  if (p.isCancel(rpeStr)) return null;

  return {
    templateId: template.id,
    target,
    sets,
    rpe: rpeStr && (rpeStr as string).trim() ? parseFloat(rpeStr as string) : null,
    aiAdjusted: false,
    adjustmentReason: null,
  };
}
