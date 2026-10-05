"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get theme from localStorage, default to light
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = (stored || "light") as "light" | "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function applyTheme(newTheme: "light" | "dark") {
    const root = document.documentElement;
    
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    setIsDark(newTheme === "dark");
  }

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  }

  if (!mounted) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="group relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background/80 backdrop-blur-sm transition-all duration-200 hover:bg-surface-hover hover:border-border-strong active:scale-95"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Light mode sun icon */}
      <div
        className={`absolute transition-all duration-300 ${
          isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <MoonIcon
          size={16}
          weight="fill"
          className="text-blue-300 group-hover:text-blue-200"
        />
      </div>

      {/* Dark mode moon icon */}
      <div
        className={`absolute transition-all duration-300 ${
          isDark ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <SunIcon
          size={16}
          weight="fill"
          className="text-amber-500 group-hover:text-amber-600"
        />
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-200 pointer-events-none" />
    </button>
  );
}
