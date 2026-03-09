/**
 * Generic registry factory — eliminates the duplicate Map+register+resolve+clear
 * pattern used by both domain.ts and progression.ts.
 */

export interface Registry<T> {
  register(item: T): void;
  resolve(id: string): T;
  list(): T[];
  clear(): void;
}

/**
 * Create a typed registry keyed by a string ID extracted from each item.
 * @param entityName — used in error messages, e.g. "Domain" or "ProgressionRule"
 * @param getId — extracts the unique key from an item
 */
export function createRegistry<T>(entityName: string, getId: (item: T) => string): Registry<T> {
  const map = new Map<string, T>();

  return {
    register(item: T): void {
      const id = getId(item);
      if (map.has(id)) {
        throw new Error(`${entityName} '${id}' is already registered`);
      }
      map.set(id, item);
    },

    resolve(id: string): T {
      const item = map.get(id);
      if (!item) {
        const available = [...map.keys()].join(', ');
        throw new Error(`Unknown ${entityName} '${id}'. Available: ${available}`);
      }
      return item;
    },

    list(): T[] {
      return [...map.values()];
    },

    clear(): void {
      map.clear();
    },
  };
}
