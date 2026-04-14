import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { moves } from "@/db/schema";
import { AppHeader } from "@/components/app/AppHeader";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { QueueFlusher } from "@/components/app/QueueFlusher";

export default async function MoveLayout({
  params,
  children,
}: {
  params: Promise<{ moveId: string }>;
  children: React.ReactNode;
}) {
  const { moveId } = await params;
  const session = await requireSession();
  const { role } = await requireMoveAccess(moveId);
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(eq(moves.id, moveId))
    .limit(1);

  if (!move) notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader session={session} move={move} role={role} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <MobileBottomNav moveId={moveId} />
      <QueueFlusher />
    </div>
  );
}
