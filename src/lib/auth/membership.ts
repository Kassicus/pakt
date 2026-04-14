import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { moveMembers } from "@/db/schema";
import { requireUserId } from "./index";

export type MoveRole = "owner" | "editor" | "helper";

const RANK: Record<MoveRole, number> = { helper: 1, editor: 2, owner: 3 };

export function roleAtLeast(have: MoveRole, need: MoveRole): boolean {
  return RANK[have] >= RANK[need];
}

export async function requireMoveAccess(
  moveId: string,
  minRole: MoveRole = "helper",
): Promise<{ userId: string; role: MoveRole }> {
  const userId = await requireUserId();
  const db = getDb();
  const [member] = await db
    .select({ role: moveMembers.role })
    .from(moveMembers)
    .where(and(eq(moveMembers.moveId, moveId), eq(moveMembers.userId, userId)))
    .limit(1);
  if (!member) notFound();
  if (!roleAtLeast(member.role, minRole)) {
    throw new Error("Insufficient permissions for this move");
  }
  return { userId, role: member.role };
}
