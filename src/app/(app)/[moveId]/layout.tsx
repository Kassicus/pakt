import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/db";
import { moves } from "@/db/schema";
import { DesktopTopNav, MobileBottomNav } from "@/components/app/MobileBottomNav";
import { UserMenu } from "@/components/app/UserMenu";

export default async function MoveLayout({
  params,
  children,
}: {
  params: Promise<{ moveId: string }>;
  children: React.ReactNode;
}) {
  const { moveId } = await params;
  const session = await requireSession();
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, session.userId)))
    .limit(1);

  if (!move) notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <Link
            href="/moves"
            className="truncate text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← {move.name}
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <DesktopTopNav moveId={moveId} />
            <UserMenu email={session.email} name={session.name} image={session.image} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <MobileBottomNav moveId={moveId} />
    </div>
  );
}
