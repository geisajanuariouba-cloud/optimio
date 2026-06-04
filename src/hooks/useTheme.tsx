import { useEffect, useState, useCallback } from "react";

type Mode = "dark" | "light";
const KEY = "optimio.theme";

export function useTheme() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as Mode) || "dark";
  });

  useEffect(() => {
    const root = document.querySelector(".theme-skillset");
    if (!root) return;
    if (mode === "light") root.classList.add("light");
    else root.classList.remove("light");
    localStorage.setItem(KEY, mode);
  }, [mode]);

  const toggle = useCallback(() => setMode(m => (m === "dark" ? "light" : "dark")), []);
  return { mode, setMode, toggle };
}
