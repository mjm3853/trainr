import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDomain,
  getDomain,
  listDomains,
  clearRegistry,
} from '../../src/core/domain.js';
import { workoutDomain } from '../../src/domains/workout/index.js';

describe('domain registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registerDomain() succeeds', () => {
    expect(() => registerDomain(workoutDomain)).not.toThrow();
  });

  it('registerDomain() rejects duplicate', () => {
    registerDomain(workoutDomain);
    expect(() => registerDomain(workoutDomain)).toThrow(
      "Domain 'workout' is already registered",
    );
  });

  it('getDomain() returns module', () => {
    registerDomain(workoutDomain);
    expect(getDomain('workout')).toBe(workoutDomain);
  });

  it('getDomain() throws with available list on miss', () => {
    registerDomain(workoutDomain);
    expect(() => getDomain('golf')).toThrow(
      "Unknown Domain 'golf'. Available: workout",
    );
  });

  it('listDomains() returns all registered', () => {
    registerDomain(workoutDomain);
    expect(listDomains()).toEqual([workoutDomain]);
  });

  it('clearRegistry() empties', () => {
    registerDomain(workoutDomain);
    clearRegistry();
    expect(listDomains()).toEqual([]);
  });
});
