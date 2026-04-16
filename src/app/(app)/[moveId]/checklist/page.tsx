import { asc, eq } from "drizzle-orm";
import { ListChecks } from "lucide-react";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { checklistItems, moves } from "@/db/schema";
import { ChecklistView } from "@/components/app/ChecklistView";
import { ChecklistNudgeScheduler } from "@/components/app/ChecklistNudgeScheduler";
import type { ChecklistCategory } from "@/lib/checklist-defaults";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  await requireMoveAccess(moveId);
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(eq(moves.id, moveId))
    .limit(1);

  if (!move) return null;

  const rows = await db
    .select({
      id: checklistItems.id,
      text: checklistItems.text,
      category: checklistItems.category,
      doneAt: checklistItems.doneAt,
      sortOrder: checklistItems.sortOrder,
    })
    .from(checklistItems)
    .where(eq(checklistItems.moveId, moveId))
    .orderBy(asc(checklistItems.sortOrder), asc(checklistItems.createdAt));

  const total = rows.length;
  const done = rows.filter((r) => r.doneAt !== null).length;
  const pending = total - done;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <ListChecks className="size-7 text-muted-foreground" />
            Checklist
          </h1>
          <p className="mt-1 text-muted-foreground">
            {total === 0
              ? "Add tasks to track everything outside of inventory."
              : `${done} of ${total} done`}
          </p>
        </div>
      </div>

      <ChecklistView
        moveId={moveId}
        items={rows.map((r) => ({
          id: r.id,
          text: r.text,
          category: r.category as ChecklistCategory,
          done: r.doneAt !== null,
        }))}
      />

      <ChecklistNudgeScheduler moveName={move.name} pendingCount={pending} />
    </div>
  );
}
