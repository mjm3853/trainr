import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerRule,
  resolveRule,
  clearRules,
  type ProgressionRule,
  type ProgressionParams,
} from '../../src/core/progression.js';
import type { ActivityTarget } from '../../src/core/schemas.js';

const mockRule: ProgressionRule = {
  id: 'test.mock_rule',
  domain: 'test',
  compute(_params: ProgressionParams): ActivityTarget {
    return {
      planned: { kind: 'completion', completed: false },
      note: null,
    };
  },
};

describe('progression rule registry', () => {
  beforeEach(() => {
    clearRules();
  });

  it('registerRule() succeeds', () => {
    expect(() => registerRule(mockRule)).not.toThrow();
  });

  it('registerRule() rejects duplicate', () => {
    registerRule(mockRule);
    expect(() => registerRule(mockRule)).toThrow(
      "ProgressionRule 'test.mock_rule' is already registered",
    );
  });

  it('resolveRule() returns rule', () => {
    registerRule(mockRule);
    expect(resolveRule('test.mock_rule')).toBe(mockRule);
  });

  it('resolveRule() throws on miss', () => {
    registerRule(mockRule);
    expect(() => resolveRule('test.nonexistent')).toThrow(
      "Unknown ProgressionRule 'test.nonexistent'. Available: test.mock_rule",
    );
  });

  it('clearRules() empties', () => {
    registerRule(mockRule);
    clearRules();
    expect(() => resolveRule('test.mock_rule')).toThrow();
  });
});
