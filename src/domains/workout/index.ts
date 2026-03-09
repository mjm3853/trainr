import type { DomainModule } from '../../core/domain.js';
import { ok, err } from '../../core/domain.js';
import { wendlerMainRule, wendlerBBBRule } from './rules/wendler.js';
import { linearProgressionRule } from './rules/linear.js';
import { stewSmithPullupRule, stewSmithAssistanceRule } from './rules/stew-smith.js';
import { formatActivityTarget, formatActivityRecord, summarizeSession } from './format.js';
import { WorkoutSettingsSchema, StewSmithWorkoutSettingsSchema } from './schemas.js';

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
  progressionRules: [wendlerMainRule, wendlerBBBRule, linearProgressionRule, stewSmithPullupRule, stewSmithAssistanceRule],
  contextQuestions: [
    { id: 'energy', kind: 'energy_level' },
    { id: 'pain', kind: 'pain_points' },
    { id: 'time', kind: 'time_constraint' },
  ],
  systemPrompt: WORKOUT_SYSTEM_PROMPT,

  validateProgramSettings(settings: unknown) {
    // Accept either generic workout settings or Stew Smith pull-up settings.
    const base = WorkoutSettingsSchema.safeParse(settings);
    if (base.success) {
      return ok(undefined);
    }
    // try stew smith schema if base failed
    try {
      StewSmithWorkoutSettingsSchema.parse(settings);
      return ok(undefined);
    } catch (e) {
      // combine errors from both schemas
      const messages: string[] = [];
      if (!base.success) {
        messages.push(...base.error.issues.map((i) => i.message));
      }
      if (e instanceof Error && 'errors' in e) {
        // zod error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages.push(...((e as any).errors.map((i: any) => i.message)));
      }
      return err(messages.join(', '));
    }
  },

  formatActivityTarget,
  formatActivityRecord,
  summarizeSession,

  contextForAI(settings, context) {
    // Try both schemas when constructing context; default to WorkoutSettings if possible.
    let tms: Record<string, number> = {};
    let unit: string = '';

    const workoutParse = WorkoutSettingsSchema.safeParse(settings);
    if (workoutParse.success) {
      tms = workoutParse.data.trainingMaxes;
      unit = workoutParse.data.unit;
    } else {
      const stewParse = StewSmithWorkoutSettingsSchema.safeParse(settings);
      if (stewParse.success) {
        tms = stewParse.data.trainingMaxes;
        unit = stewParse.data.unit;
      }
    }

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
