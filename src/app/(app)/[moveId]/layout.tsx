import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves } from "@/db/schema";

export default async function MoveLayout({
  params,
  children,
}: {
  params: Promise<{ moveId: string }>;
  children: React.ReactNode;
}) {
  const { moveId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)))
    .limit(1);

  if (!move) notFound();

  return <>{children}</>;
}
