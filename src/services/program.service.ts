/**
 * Program service — creation, retrieval, and position management.
 */

import { v4 as uuid } from 'uuid';
import type { ProgramConfig, ProgramRecord, ProgramPosition } from '../core/schemas.js';
import { ProgramConfigSchema } from '../core/schemas.js';
import { getDomain } from '../core/domain.js';
import type { Repositories } from '../db/repository.js';

export interface CreateProgramInput {
  config: ProgramConfig;
}

export async function createProgram(
  input: CreateProgramInput,
  repos: Repositories,
): Promise<ProgramRecord> {
  // Validate config
  const config = ProgramConfigSchema.parse(input.config);

  // Validate domain-specific settings
  const domain = getDomain(config.domain);
  const validation = domain.validateProgramSettings(config.settings);
  if (!validation.ok) {
    throw new Error(`Invalid program settings: ${validation.error}`);
  }

  const now = new Date();
  const program: ProgramRecord = {
    id: uuid(),
    name: config.name,
    domain: config.domain,
    goalStatement: config.goalStatement,
    configJson: JSON.stringify(config),
    settings: config.settings,
    startedAt: now,
    completedAt: null,
    createdAt: now,
  };

  await repos.programs.save(program);

  // Initialize position at the start
  const position: ProgramPosition = {
    programId: program.id,
    currentCycleOrdinal: config.cycles[0]?.ordinal ?? 0,
    currentSessionOrdinal: 0,
    updatedAt: now,
  };
  await repos.positions.save(position);

  return program;
}

export async function getActivePrograms(repos: Repositories): Promise<ProgramRecord[]> {
  return repos.programs.findActive();
}

export async function getProgramById(
  id: string,
  repos: Repositories,
): Promise<ProgramRecord | null> {
  return repos.programs.findById(id);
}

export async function getProgramPosition(
  programId: string,
  repos: Repositories,
): Promise<ProgramPosition | null> {
  return repos.positions.findByProgramId(programId);
}

export function parseProgramConfig(program: ProgramRecord): ProgramConfig {
  return ProgramConfigSchema.parse(JSON.parse(program.configJson));
}

export async function advanceProgramPosition(
  programId: string,
  repos: Repositories,
  newPosition: { cycleOrdinal: number; sessionOrdinal: number },
): Promise<void> {
  const position: ProgramPosition = {
    programId,
    currentCycleOrdinal: newPosition.cycleOrdinal,
    currentSessionOrdinal: newPosition.sessionOrdinal,
    updatedAt: new Date(),
  };
  await repos.positions.save(position);
}

export async function completeProgram(programId: string, repos: Repositories): Promise<void> {
  await repos.programs.update(programId, { completedAt: new Date() });
}
