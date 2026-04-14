"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/actions/members";

export function AcceptInviteButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await acceptInvitation(token);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't accept invitation",
        );
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending} className="w-full">
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : null}
      Accept invitation
    </Button>
  );
}
