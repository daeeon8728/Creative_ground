"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored ? stored === "dark" : prefersDark;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="
        relative w-12 h-6 rounded-full border-2 border-[var(--ink)]
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
        bg-[var(--surface-2)]
      "
    >
      <span
        className="
          absolute top-0.5 left-0.5 w-4 h-4 rounded-full
          bg-[var(--ink)] transition-transform duration-200
          flex items-center justify-center text-[8px]
        "
        style={{ transform: dark ? "translateX(24px)" : "translateX(0)" }}
      >
        {dark ? "🌙" : "☀"}
      </span>
    </button>
  );
}
