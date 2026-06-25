import { useEffect, useState, useCallback } from "react";

type Mode = "dark" | "light";
const KEY = "optimio.theme";

export function useTheme() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as Mode) || "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", mode === "light");
    localStorage.setItem(KEY, mode);
  }, [mode]);

  const toggle = useCallback(() => setMode(m => (m === "dark" ? "light" : "dark")), []);
  return { mode, setMode, toggle };
}
