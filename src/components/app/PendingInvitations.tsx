"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInvitation } from "@/actions/members";
import type { MoveRole } from "@/lib/auth/membership";

type Invitation = {
  id: string;
  email: string;
  role: MoveRole;
  url: string;
  expiresAt: string;
};

const roleLabels: Record<MoveRole, string> = {
  owner: "Owner",
  editor: "Editor",
  helper: "Helper",
};

export function PendingInvitations({
  invitations,
  canManage,
}: {
  invitations: Invitation[];
  canManage: boolean;
}) {
  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending invitations.</p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {invitations.map((inv) => (
        <InvitationRow key={inv.id} invitation={inv} canManage={canManage} />
      ))}
    </ul>
  );
}

function InvitationRow({
  invitation,
  canManage,
}: {
  invitation: Invitation;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [revoked, setRevoked] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitation.url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy manually.");
    }
  }

  function onRevoke() {
    if (!confirm(`Revoke invitation for ${invitation.email}?`)) return;
    startTransition(async () => {
      try {
        await revokeInvitation(invitation.id);
        setRevoked(true);
        toast.success("Invitation revoked.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't revoke");
      }
    });
  }

  if (revoked) return null;

  const expires = new Date(invitation.expiresAt);

  return (
    <li className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{invitation.email}</div>
          <Badge variant="outline">{roleLabels[invitation.role]}</Badge>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          Expires {expires.toLocaleDateString()}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={copyLink}>
          <Copy className="mr-1.5 size-3.5" /> Copy link
        </Button>
        {canManage ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onRevoke}
            disabled={isPending}
            aria-label="Revoke invitation"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
