import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { itemCategories, itemPhotos, items } from "@/db/schema";
import { DecisionQuiz } from "@/components/app/DecisionQuiz";
import { PhotoThumbnail } from "@/components/app/PhotoThumbnail";
import type { DecisionAnswers } from "@/db/schema";
import type { DecisionInputs } from "@/lib/predictions";

export default async function DecidePage({
  params,
}: {
  params: Promise<{ moveId: string; itemId: string }>;
}) {
  const { moveId, itemId } = await params;
  await requireMoveAccess(moveId);
  const db = getDb();

  const [item] = await db
    .select({
      id: items.id,
      name: items.name,
      moveId: items.moveId,
      decisionAnswers: items.decisionAnswers,
      categoryLabel: itemCategories.label,
    })
    .from(items)
    .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
    .where(
      and(
        eq(items.id, itemId),
        eq(items.moveId, moveId),
        isNull(items.deletedAt),
      ),
    )
    .limit(1);

  if (!item) notFound();

  const [photo] = await db
    .select({ blobUrl: itemPhotos.blobUrl })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId))
    .orderBy(asc(itemPhotos.createdAt))
    .limit(1);

  const initial: DecisionInputs = (item.decisionAnswers as DecisionAnswers | null) ?? {};

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href={`/${moveId}/triage`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back to triage
        </Link>
        <div className="mt-2 flex items-center gap-3">
          {photo && <PhotoThumbnail src={photo.blobUrl} alt={item.name} size={56} />}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
            {item.categoryLabel && (
              <p className="text-sm text-muted-foreground">{item.categoryLabel}</p>
            )}
          </div>
        </div>
      </div>
      <DecisionQuiz itemId={itemId} moveId={moveId} itemName={item.name} initial={initial} />
    </div>
  );
}
