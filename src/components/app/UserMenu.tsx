"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { ThemeToggleMenuItem } from "./ThemeToggle";

export function UserMenu({
  email,
  name,
  image,
}: {
  email: string;
  name: string | null;
  image: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const displayName = name ?? email.split("@")[0];
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  function onSignOut() {
    startTransition(async () => {
      try {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-out failed");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar className="size-8">
          {image && <AvatarImage src={image} alt={displayName} />}
          <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ThemeToggleMenuItem />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onSignOut} disabled={isPending}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
