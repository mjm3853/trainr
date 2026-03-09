import { z } from 'zod';

export const LiftSchema = z.enum(['squat', 'bench', 'deadlift', 'press', 'row', 'pullup', 'dip', 'curl']);
export type Lift = z.infer<typeof LiftSchema>;

export const WeightUnitSchema = z.enum(['lbs', 'kg']);
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
