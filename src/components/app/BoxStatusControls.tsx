"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateBoxStatus, deleteBox } from "@/actions/boxes";
import type { BoxStatus } from "@/lib/validators";

const NEXT_STEP: Partial<Record<BoxStatus, { label: string; next: BoxStatus }>> = {
  empty: { label: "Start packing", next: "packing" },
  packing: { label: "Seal box", next: "sealed" },
  sealed: { label: "Load on truck", next: "loaded" },
  loaded: { label: "Mark in transit", next: "in_transit" },
  in_transit: { label: "Delivered", next: "delivered" },
  delivered: { label: "Fully unpacked", next: "unpacked" },
};

export function BoxStatusControls({
  boxId,
  status,
}: {
  boxId: string;
  status: BoxStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const next = NEXT_STEP[status];

  function advance() {
    if (!next || isPending) return;
    startTransition(async () => {
      try {
        await updateBoxStatus(boxId, next.next);
        toast.success(`Box ${next.next.replace("_", " ")}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update box");
      }
    });
  }

  function onDelete() {
    if (!confirm("Delete this box? Items will be unlinked but not deleted.")) return;
    startTransition(async () => {
      try {
        await deleteBox(boxId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete box");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <Button onClick={advance} disabled={isPending}>
          {next.label}
        </Button>
      )}
      <Button variant="ghost" onClick={onDelete} disabled={isPending}>
        Delete box
      </Button>
    </div>
  );
}
