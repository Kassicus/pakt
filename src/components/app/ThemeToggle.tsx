"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ThemeToggleMenuItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme !== "light" : true;
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light" : "Switch to dark";

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        setTheme(isDark ? "light" : "dark");
      }}
    >
      <Icon className="mr-2 size-4" />
      {label}
    </DropdownMenuItem>
  );
}
