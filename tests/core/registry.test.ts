import { describe, it, expect, beforeEach } from 'vitest';
import { createRegistry, type Registry } from '../../src/core/registry.js';

interface Widget {
  id: string;
  value: number;
}

describe('createRegistry', () => {
  let registry: Registry<Widget>;

  beforeEach(() => {
    registry = createRegistry<Widget>('Widget', (w) => w.id);
  });

  it('register() stores an item and resolve() retrieves it', () => {
    const widget: Widget = { id: 'alpha', value: 42 };
    registry.register(widget);
    expect(registry.resolve('alpha')).toBe(widget);
  });

  it('register() throws on duplicate IDs', () => {
    registry.register({ id: 'dup', value: 1 });
    expect(() => registry.register({ id: 'dup', value: 2 })).toThrow(
      "Widget 'dup' is already registered",
    );
  });

  it('resolve() throws with available list on miss', () => {
    registry.register({ id: 'aaa', value: 1 });
    registry.register({ id: 'bbb', value: 2 });
    expect(() => registry.resolve('zzz')).toThrow(
      "Unknown Widget 'zzz'. Available: aaa, bbb",
    );
  });

  it('list() returns all registered items', () => {
    const a: Widget = { id: 'a', value: 1 };
    const b: Widget = { id: 'b', value: 2 };
    registry.register(a);
    registry.register(b);
    expect(registry.list()).toEqual([a, b]);
  });

  it('clear() empties the registry', () => {
    registry.register({ id: 'x', value: 99 });
    registry.clear();
    expect(registry.list()).toEqual([]);
    expect(() => registry.resolve('x')).toThrow();
  });
});
