"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder to avoid layout shift
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-brand-border bg-brand-surface/90 text-brand-muted shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:text-brand-text hover:border-brand-accent/50 hover:bg-brand-background dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)] dark:text-brand-text"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
