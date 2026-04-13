"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackageOpen, Shuffle, Box, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ moveId }: { moveId: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/${moveId}/dashboard`, label: "Home", icon: Home },
    { href: `/${moveId}/inventory`, label: "Inventory", icon: PackageOpen },
    { href: `/${moveId}/triage`, label: "Triage", icon: Shuffle },
    { href: `/${moveId}/boxes`, label: "Boxes", icon: Box },
    { href: `/${moveId}/pack`, label: "Scan", icon: ScanLine },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopTopNav({ moveId }: { moveId: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/${moveId}/dashboard`, label: "Dashboard" },
    { href: `/${moveId}/inventory`, label: "Inventory" },
    { href: `/${moveId}/triage`, label: "Triage" },
    { href: `/${moveId}/boxes`, label: "Boxes" },
    { href: `/${moveId}/pack`, label: "Pack" },
    { href: `/${moveId}/labels`, label: "Labels" },
  ];

  return (
    <nav className="hidden md:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
