"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addItemsToBox } from "@/actions/boxes";

export type AvailableItem = {
  id: string;
  name: string;
  quantity: number;
  categoryLabel: string | null;
  sourceRoomLabel: string | null;
  disposition: string;
};

export function AddItemsToBoxPanel({
  boxId,
  items,
  preferredRoomId,
}: {
  boxId: string;
  items: AvailableItem[];
  preferredRoomId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored = items
      .filter((i) =>
        q
          ? i.name.toLowerCase().includes(q) ||
            i.categoryLabel?.toLowerCase().includes(q) ||
            i.sourceRoomLabel?.toLowerCase().includes(q)
          : true,
      )
      .slice(0, 40);
    return scored;
  }, [query, items]);

  function add(itemId: string) {
    if (isPending) return;
    setPendingId(itemId);
    startTransition(async () => {
      try {
        await addItemsToBox(boxId, [itemId]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add");
      } finally {
        setPendingId(null);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No unassigned items marked for moving or storage. Add some on the Inventory page.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items to add…"
          className="pl-9"
        />
      </div>
      <ul className="max-h-96 divide-y overflow-y-auto rounded-lg border bg-card">
        {filtered.map((item) => {
          const pending = pendingId === item.id;
          const highlight = preferredRoomId && item.sourceRoomLabel
            ? false
            : false;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <div className="truncate font-medium">{item.name}</div>
                  {item.quantity > 1 && (
                    <div className="text-xs tabular-nums text-muted-foreground">
                      × {item.quantity}
                    </div>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {item.sourceRoomLabel && <span>{item.sourceRoomLabel}</span>}
                  {item.categoryLabel && (
                    <>
                      <span>·</span>
                      <span>{item.categoryLabel}</span>
                    </>
                  )}
                </div>
              </div>
              {highlight && <Badge variant="secondary" className="text-xs">same room</Badge>}
              <button
                type="button"
                onClick={() => add(item.id)}
                disabled={pending || isPending}
                aria-label={`Add ${item.name}`}
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="p-8 text-center text-sm text-muted-foreground">
            No matches.
          </li>
        )}
      </ul>
    </div>
  );
}
