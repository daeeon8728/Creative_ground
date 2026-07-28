"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="toolbar-btn icon-only" disabled aria-label="Toggle theme">
        <Sun size={18} />
      </button>
    );
  }

  const isDark = theme === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle Dark/Light Mode"
      title="Toggle Dark/Light Mode"
      className="toolbar-btn icon-only"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
