import { useCallback, useState } from 'react';
import type { ZodType } from 'zod';

/** UI-only preferences stay independent of unsaved collection/environment edits. */
export function useLayoutPreference<T>(key: string, schema: ZodType<T>, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? schema.parse(JSON.parse(saved)) : initial;
    } catch {
      return initial;
    }
  });
  const save = useCallback(
    (next: T) => {
      const parsed = schema.parse(next);
      setValue(parsed);
      try {
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        /* Session state still works when storage is unavailable. */
      }
    },
    [key, schema],
  );
  return [value, save] as const;
}
