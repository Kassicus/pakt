import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves } from "@/db/schema";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  planning: "Planning",
  packing: "Packing",
  in_transit: "In transit",
  unpacking: "Unpacking",
  done: "Done",
};

export default async function MovesPage() {
  const userId = await requireUserId();
  const db = getDb();

  const userMoves = await db
    .select()
    .from(moves)
    .where(eq(moves.ownerClerkUserId, userId))
    .orderBy(desc(moves.createdAt));

  if (userMoves.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight">No moves yet</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Start by creating your move. You&apos;ll add rooms, inventory items room by room,
          and pakt will help plan your boxes and truck.
        </p>
        <Link href="/moves/new" className={`mt-6 ${buttonVariants({ size: "lg" })}`}>
          <Plus className="mr-2 size-4" /> Create your first move
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Your moves</h1>
        <Link href="/moves/new" className={buttonVariants()}>
          <Plus className="mr-2 size-4" /> New move
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {userMoves.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{m.name}</CardTitle>
                <Badge variant="secondary">{statusLabels[m.status] ?? m.status}</Badge>
              </div>
              <CardDescription>
                {m.plannedMoveDate
                  ? `Planned for ${new Date(m.plannedMoveDate).toLocaleDateString()}`
                  : "No date set"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {m.originAddress && <div>From: {m.originAddress}</div>}
              {m.destinationAddress && <div>To: {m.destinationAddress}</div>}
            </CardContent>
            <CardFooter>
              <Link
                href={`/${m.id}/dashboard`}
                className={`ml-auto ${buttonVariants({ variant: "secondary" })}`}
              >
                Open <ArrowRight className="ml-2 size-4" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
