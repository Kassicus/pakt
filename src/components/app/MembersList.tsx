"use client";

import { useTransition } from "react";
import { Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeMemberRole, removeMember } from "@/actions/members";
import type { MoveRole } from "@/lib/auth/membership";

type Member = {
  userId: string;
  role: MoveRole;
  name: string;
  email: string;
  imageUrl: string | null;
  isYou: boolean;
};

const roleLabels: Record<MoveRole, string> = {
  owner: "Owner",
  editor: "Editor",
  helper: "Helper",
};

export function MembersList({
  moveId,
  members,
  canManage,
}: {
  moveId: string;
  members: Member[];
  canManage: boolean;
}) {
  return (
    <ul className="divide-y rounded-md border">
      {members.map((m) => (
        <MemberRow key={m.userId} moveId={moveId} member={m} canManage={canManage} />
      ))}
    </ul>
  );
}

function MemberRow({
  moveId,
  member,
  canManage,
}: {
  moveId: string;
  member: Member;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const initials =
    member.name
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "?";

  function onRoleChange(next: string | null) {
    if (!next || next === member.role) return;
    startTransition(async () => {
      try {
        await changeMemberRole({
          moveId,
          userId: member.userId,
          role: next as MoveRole,
        });
        toast.success(`${member.name} is now ${roleLabels[next as MoveRole]}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't change role");
      }
    });
  }

  function onRemove() {
    if (!confirm(`Remove ${member.name} from this move?`)) return;
    startTransition(async () => {
      try {
        await removeMember({ moveId, userId: member.userId });
        toast.success(`${member.name} removed.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove");
      }
    });
  }

  const showControls = canManage && member.role !== "owner" && !member.isYou;

  return (
    <li className="flex items-center gap-3 p-3">
      <Avatar className="size-9 shrink-0">
        {member.imageUrl ? (
          <AvatarImage src={member.imageUrl} alt={member.name} />
        ) : null}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">
            {member.name}
            {member.isYou ? (
              <span className="ml-1 text-xs text-muted-foreground">(you)</span>
            ) : null}
          </div>
        </div>
        <div className="truncate text-xs text-muted-foreground">{member.email}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showControls ? (
          <Select
            value={member.role}
            onValueChange={onRoleChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="helper">Helper</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={member.role === "owner" ? "default" : "outline"}>
            {roleLabels[member.role]}
          </Badge>
        )}
        {showControls ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onRemove}
            disabled={isPending}
            aria-label={`Remove ${member.name}`}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserMinus className="size-4" />
            )}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
