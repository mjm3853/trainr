import type { DomainModule } from '../../core/domain.js';
import { ok, err } from '../../core/domain.js';
import { wendlerMainRule, wendlerBBBRule } from './rules/wendler.js';
import { linearProgressionRule } from './rules/linear.js';
import { formatActivityTarget, formatActivityRecord, summarizeSession } from './format.js';
import { WorkoutSettingsSchema } from './schemas.js';

const WORKOUT_SYSTEM_PROMPT = `You are a knowledgeable strength and conditioning coach. You help athletes follow progressive overload programs safely and effectively.

Your role:
- Analyze the athlete's context (energy, pain, time constraints) before their session
- Suggest evidence-based adjustments when context warrants them
- Prioritize movement quality and injury prevention over raw numbers
- Keep advice concise and actionable — athletes are about to train, not read an essay

When the athlete reports pain or fatigue:
- Lower back pain: reduce squat and deadlift volume/intensity; suggest alternatives if severe
- Low energy: reduce AMRAP aggression, consider dropping supplemental volume
- Limited time: prioritize main sets, skip supplemental

Progression philosophy:
- AMRAP sets should be 1-2 reps shy of failure — leave reps in the tank
- Consistent training > heroic individual sessions
- Deload weeks are mandatory, not optional`;

export const workoutDomain: DomainModule = {
  id: 'workout',
  displayName: 'Strength Training',
  progressionRules: [wendlerMainRule, wendlerBBBRule, linearProgressionRule],
  contextQuestions: [
    { id: 'energy', kind: 'energy_level' },
    { id: 'pain', kind: 'pain_points' },
    { id: 'time', kind: 'time_constraint' },
  ],
  systemPrompt: WORKOUT_SYSTEM_PROMPT,

  validateProgramSettings(settings: unknown) {
    const result = WorkoutSettingsSchema.safeParse(settings);
    if (!result.success) {
      return err(result.error.issues.map((i) => i.message).join(', '));
    }
    return ok(undefined);
  },

  formatActivityTarget,
  formatActivityRecord,
  summarizeSession,

  contextForAI(settings, context) {
    const parsed = WorkoutSettingsSchema.safeParse(settings);
    if (!parsed.success) return {};

    const tms = parsed.data.trainingMaxes;
    const unit = parsed.data.unit;

    return {
      trainingMaxes: Object.entries(tms).reduce(
        (acc, [lift, tm]) => ({ ...acc, [lift]: `${tm}${unit}` }),
        {} as Record<string, string>,
      ),
      unit,
      painPoints: context?.painPoints ?? [],
      energyLevel: context?.energyLevel ?? null,
    };
  },
};
