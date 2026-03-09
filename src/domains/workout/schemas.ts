import { z } from 'zod';

export const LiftSchema = z.enum(['squat', 'bench', 'deadlift', 'press', 'row', 'pullup', 'dip', 'curl']);
export type Lift = z.infer<typeof LiftSchema>;

export const WeightUnitSchema = z.enum(['lbs', 'kg', 'bodyweight']);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

export const WorkoutSettingsSchema = z.object({
  unit: WeightUnitSchema.default('lbs'),
  trainingMaxes: z.record(LiftSchema, z.number().positive()),
  roundingIncrement: z.number().positive().default(5),
});
export type WorkoutSettings = z.infer<typeof WorkoutSettingsSchema>;

// Config object embedded in ActivityTemplate.config for Wendler-style rules
export const WendlerMainConfigSchema = z.object({
  lift: LiftSchema,
  weekScheme: z.enum(['5s', '3s', '1s', 'deload']),
});
export type WendlerMainConfig = z.infer<typeof WendlerMainConfigSchema>;

export const WendlerBBBConfigSchema = z.object({
  lift: LiftSchema,
  sets: z.number().int().positive().default(5),
  reps: z.number().int().positive().default(10),
  percentage: z.number().positive().max(1).default(0.5),
});
export type WendlerBBBConfig = z.infer<typeof WendlerBBBConfigSchema>;

export const LinearProgressionConfigSchema = z.object({
  lift: LiftSchema,
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  incrementPerSession: z.number().positive(),
  startingWeight: z.number().positive().optional(),
});
export type LinearProgressionConfig = z.infer<typeof LinearProgressionConfigSchema>;

export const StewSmithPullupConfigSchema = z.object({
  phase: z.enum(['foundation', 'build', 'strength', 'peak', 'deload']),
  sessionNumber: z.number().int().positive(),
  exercise: z.enum(['strict', 'assisted', 'negative', 'weighted']),
});
export type StewSmithPullupConfig = z.infer<typeof StewSmithPullupConfigSchema>;

export const StewSmithAssistanceConfigSchema = z.object({
  exercise: z.enum(['negative', 'rows', 'l_pullup', 'weighted_negative', 'close_grip', 'assisted']),
  phase: z.enum(['foundation', 'build', 'strength', 'peak', 'deload']),
  sessionNumber: z.number().int().positive(),
});
export type StewSmithAssistanceConfig = z.infer<typeof StewSmithAssistanceConfigSchema>;

// Extended workout settings for Stew Smith program
export const StewSmithWorkoutSettingsSchema = z.object({
  unit: z.literal('bodyweight').default('bodyweight'),
  trainingMaxes: z.record(LiftSchema, z.number().nonnegative()),
  roundingIncrement: z.number().positive().default(1),
  currentMaxPullups: z.number().int().min(0).default(0),
  sessionsPerWeek: z.union([z.literal(3), z.literal(4)]).default(3),
  includeAssistance: z.boolean().default(true),
});
export type StewSmithWorkoutSettings = z.infer<typeof StewSmithWorkoutSettingsSchema>;
