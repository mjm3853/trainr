import { describe, it, expect } from 'vitest';
import { parseOutputFormat, applyFieldMask } from '../../src/cli/output.js';

describe('parseOutputFormat', () => {
  it("parses 'json' → 'json'", () => {
    expect(parseOutputFormat('json')).toBe('json');
  });

  it("parses 'ndjson' → 'ndjson'", () => {
    expect(parseOutputFormat('ndjson')).toBe('ndjson');
  });

  it("parses undefined → 'human'", () => {
    expect(parseOutputFormat(undefined)).toBe('human');
  });

  it("parses 'garbage' → 'human'", () => {
    expect(parseOutputFormat('garbage')).toBe('human');
  });
});

describe('applyFieldMask', () => {
  const obj = { id: '1', name: 'Squat', domain: 'workout', weight: 245 };

  it('filters to requested fields', () => {
    const result = applyFieldMask(obj, 'id,name');
    expect(result).toEqual({ id: '1', name: 'Squat' });
  });

  it('returns full object when fields is undefined', () => {
    const result = applyFieldMask(obj, undefined);
    expect(result).toEqual(obj);
  });

  it('ignores unknown field names', () => {
    const result = applyFieldMask(obj, 'id,nonexistent,name');
    expect(result).toEqual({ id: '1', name: 'Squat' });
  });
});
