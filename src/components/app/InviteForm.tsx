"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMember } from "@/actions/members";

type Role = "editor" | "helper";

export function InviteForm({ moveId }: { moveId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("helper");
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    startTransition(async () => {
      try {
        const { url } = await inviteMember({ moveId, email, role });
        setLastUrl(url);
        setEmail("");
        toast.success("Invitation created — copy the link below to share.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to invite");
      }
    });
  }

  async function copyLink() {
    if (!lastUrl) return;
    try {
      await navigator.clipboard.writeText(lastUrl);
      toast.success("Link copied — share it however you like.");
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy manually.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email" className="text-xs">
            Email
          </Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            placeholder="someone@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role" className="text-xs">
            Role
          </Label>
          <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
            <SelectTrigger id="invite-role" className="min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="helper">Helper</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="invisible text-xs" aria-hidden="true">
            &nbsp;
          </Label>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Mail className="mr-2 size-4" />
            )}
            Create invite
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Editors can edit inventory and settings. Helpers can scan and pack but can&apos;t
        change inventory.
      </p>

      {lastUrl ? (
        <div className="rounded-md border border-dashed p-3">
          <div className="text-xs text-muted-foreground">Share this link:</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
              {lastUrl}
            </code>
            <Button type="button" size="sm" variant="secondary" onClick={copyLink}>
              <Copy className="mr-1.5 size-3.5" /> Copy
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
