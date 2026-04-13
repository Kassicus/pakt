import {
  CHECKLIST_CATEGORY_LABEL,
  CHECKLIST_CATEGORY_ORDER,
  type ChecklistCategory,
} from "@/lib/checklist-defaults";
import { AddChecklistItemForm } from "./AddChecklistItemForm";
import { ChecklistRow } from "./ChecklistRow";

type ViewItem = {
  id: string;
  text: string;
  category: ChecklistCategory;
  done: boolean;
};

export function ChecklistView({
  moveId,
  items,
}: {
  moveId: string;
  items: ViewItem[];
}) {
  const grouped = new Map<ChecklistCategory, ViewItem[]>();
  for (const c of CHECKLIST_CATEGORY_ORDER) grouped.set(c, []);
  for (const it of items) grouped.get(it.category)?.push(it);

  // Within each section: open tasks first (preserving sortOrder from the query),
  // then completed at the bottom.
  for (const c of CHECKLIST_CATEGORY_ORDER) {
    const list = grouped.get(c) ?? [];
    list.sort((a, b) => Number(a.done) - Number(b.done));
  }

  return (
    <div className="space-y-6">
      <AddChecklistItemForm moveId={moveId} />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Your checklist is empty. Add your first task above.
        </div>
      ) : (
        <div className="space-y-6">
          {CHECKLIST_CATEGORY_ORDER.map((category) => {
            const list = grouped.get(category) ?? [];
            if (list.length === 0) return null;
            const doneCount = list.filter((i) => i.done).length;
            return (
              <section key={category} className="rounded-lg border bg-card">
                <header className="flex items-center justify-between border-b px-4 py-2.5">
                  <h2 className="text-sm font-semibold">
                    {CHECKLIST_CATEGORY_LABEL[category]}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {doneCount} / {list.length}
                  </span>
                </header>
                <ul className="divide-y px-4">
                  {list.map((item) => (
                    <ChecklistRow
                      key={item.id}
                      id={item.id}
                      text={item.text}
                      done={item.done}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
