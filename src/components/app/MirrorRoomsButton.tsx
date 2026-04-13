"use client";

import { useTransition } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mirrorOriginToDestination } from "@/actions/rooms";

export function MirrorRoomsButton({
  moveId,
  existingDestinationCount,
}: {
  moveId: string;
  existingDestinationCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (
      existingDestinationCount > 0 &&
      !confirm(
        `You already have ${existingDestinationCount} destination room${existingDestinationCount === 1 ? "" : "s"}. Copy origin rooms anyway? Duplicates by name will be skipped.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await mirrorOriginToDestination(moveId);
        if (result.added === 0) {
          toast.message("Nothing to mirror", {
            description: "Every origin room already has a match on destination.",
          });
        } else {
          toast.success(
            `Copied ${result.added} room${result.added === 1 ? "" : "s"} to destination${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}`,
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Mirror failed");
      }
    });
  }

  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <ArrowRightLeft className="mr-2 size-4" />
      )}
      Mirror from origin
    </Button>
  );
}
