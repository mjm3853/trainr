/**
 * Seed script — creates a Wendler 5/3/1 program for UI development.
 */

import { registerDomain } from '../core/domain.js';
import { registerRule } from '../core/progression.js';
import { initDb } from '../db/client.js';
import { createDrizzleRepositories } from '../db/repositories/drizzle/index.js';
import { workoutDomain } from '../domains/workout/index.js';
import { createProgram } from '../services/program.service.js';
import { create531Program } from '../domains/workout/programs/531-4day.js';

registerDomain(workoutDomain);
for (const rule of workoutDomain.progressionRules) {
  registerRule(rule);
}

const db = initDb();
const repos = createDrizzleRepositories(db);

const config = create531Program({
  squatTM: 275,
  benchTM: 205,
  deadliftTM: 315,
  pressTM: 135,
  includeBBB: true,
  unit: 'lbs',
});

const program = await createProgram({ config }, repos);
console.log(`Created program: ${program.name} (${program.id})`);
process.exit(0);
