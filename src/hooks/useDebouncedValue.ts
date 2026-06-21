import { useEffect, useState } from "react";

/**
 * Debounce any value (typically search input) so downstream queries / filters
 * don't run on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;
