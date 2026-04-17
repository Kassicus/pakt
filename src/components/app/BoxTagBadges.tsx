import { cn } from "@/lib/utils";
import { BOX_TAG_LABELS, boxTagSchema, type BoxTag } from "@/lib/validators";

const TAG_CLASS: Record<BoxTag, string> = {
  fragile: "bg-destructive/10 text-destructive",
  perishable: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  live_animal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function knownTags(raw: string[] | null | undefined): BoxTag[] {
  if (!raw) return [];
  return raw.filter((t): t is BoxTag => boxTagSchema.safeParse(t).success);
}

export function BoxTagBadges({
  tags,
  className,
}: {
  tags: string[] | null | undefined;
  className?: string;
}) {
  const list = knownTags(tags);
  if (list.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {list.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            TAG_CLASS[tag],
          )}
        >
          {BOX_TAG_LABELS[tag]}
        </span>
      ))}
    </span>
  );
}
