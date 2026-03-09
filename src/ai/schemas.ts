import { z } from 'zod';
import { SessionAdjustmentSchema } from '../core/schemas.js';

export const CoachResponseSchema = z.object({
  narrative: z.string().min(1),
  adjustments: z.array(SessionAdjustmentSchema).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;
