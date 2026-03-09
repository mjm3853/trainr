/**
 * Pre-session context collection via @clack/prompts.
 */

import * as p from '@clack/prompts';
import type { SessionContext, PainPoint } from '../../core/schemas.js';

export async function collectSessionContext(): Promise<SessionContext | null> {
  const skip = await p.confirm({
    message: 'Skip pre-session check-in?',
    initialValue: false,
  });

  if (p.isCancel(skip) || skip) return null;

  const energy = await p.select({
    message: 'Energy level today?',
    options: [
      { value: 5, label: '5 — Peak. Fired up.' },
      { value: 4, label: '4 — Good. Normal training day.' },
      { value: 3, label: '3 — Average. A bit flat.' },
      { value: 2, label: '2 — Low. Tired or stressed.' },
      { value: 1, label: '1 — Depleted. Barely here.' },
    ],
  });

  if (p.isCancel(energy)) return null;

  const hasPain = await p.confirm({
    message: 'Any pain or discomfort?',
    initialValue: false,
  });

  if (p.isCancel(hasPain)) return null;

  let painPoints: PainPoint[] = [];
  if (hasPain) {
    const painArea = await p.text({
      message: 'Where? (e.g. "lower back", "left knee")',
      placeholder: 'lower back',
    });
    if (p.isCancel(painArea)) return null;

    const severity = await p.select({
      message: 'How severe?',
      options: [
        { value: 1, label: '1 — Minor. Manageable.' },
        { value: 2, label: '2 — Moderate. Affects movement.' },
        { value: 3, label: '3 — Significant. May need to skip.' },
      ],
    });
    if (p.isCancel(severity)) return null;

    painPoints = [{ area: painArea as string, severity: severity as 1 | 2 | 3 }];
  }

  const timeLimit = await p.confirm({
    message: 'Time constraint today?',
    initialValue: false,
  });
  if (p.isCancel(timeLimit)) return null;

  let timeConstraintMinutes: number | null = null;
  if (timeLimit) {
    const minutes = await p.text({
      message: 'How many minutes available?',
      placeholder: '45',
      validate: (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 5) return 'Enter a number of minutes (min 5)';
      },
    });
    if (p.isCancel(minutes)) return null;
    timeConstraintMinutes = parseInt(minutes as string, 10);
  }

  const notes = await p.text({
    message: 'Anything else your coach should know? (optional)',
    placeholder: 'Flew in last night, poor sleep',
  });
  if (p.isCancel(notes)) return null;

  return {
    energyLevel: energy as 1 | 2 | 3 | 4 | 5,
    painPoints,
    timeConstraintMinutes,
    location: 'gym',
    additionalNotes: (notes as string) || '',
    recordedAt: new Date(),
  };
}
