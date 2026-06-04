import { useEffect, useState, useCallback } from "react";

const KEY = "optimio.devMode";

function read(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function useDevMode() {
  const [enabled, setEnabled] = useState<boolean>(() => read());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setEnabled(read());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    localStorage.setItem(KEY, next ? "1" : "0");
    setEnabled(next);
    // dispatch so other tabs/components react
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  }, []);

  const set = useCallback((v: boolean) => {
    localStorage.setItem(KEY, v ? "1" : "0");
    setEnabled(v);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  }, []);

  return { devMode: enabled, toggleDevMode: toggle, setDevMode: set };
}
