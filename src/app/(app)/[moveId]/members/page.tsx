import { eq, and, asc, isNull, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { moveInvitations, moveMembers } from "@/db/schema";
import { InviteForm } from "@/components/app/InviteForm";
import { MembersList } from "@/components/app/MembersList";
import { PendingInvitations } from "@/components/app/PendingInvitations";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  const { userId, role } = await requireMoveAccess(moveId);
  const canManage = role === "owner";

  const db = getDb();
  const memberRows = await db
    .select({
      userId: moveMembers.userId,
      role: moveMembers.role,
      addedAt: moveMembers.addedAt,
    })
    .from(moveMembers)
    .where(eq(moveMembers.moveId, moveId))
    .orderBy(asc(moveMembers.addedAt));

  const userIds = memberRows.map((m) => m.userId);
  const client = await clerkClient();
  const userList = userIds.length
    ? (await client.users.getUserList({ userId: userIds })).data
    : [];
  const userById = new Map(userList.map((u) => [u.id, u]));

  const members = memberRows.map((m) => {
    const u = userById.get(m.userId);
    const email =
      u?.primaryEmailAddress?.emailAddress ??
      u?.emailAddresses[0]?.emailAddress ??
      "";
    const name = u?.fullName?.trim() || email.split("@")[0] || "Unknown";
    return {
      userId: m.userId,
      role: m.role,
      name,
      email,
      imageUrl: u?.imageUrl ?? null,
      isYou: m.userId === userId,
    };
  });

  const now = new Date();
  const invitationRows = canManage
    ? await db
        .select({
          id: moveInvitations.id,
          email: moveInvitations.email,
          role: moveInvitations.role,
          token: moveInvitations.token,
          expiresAt: moveInvitations.expiresAt,
        })
        .from(moveInvitations)
        .where(
          and(
            eq(moveInvitations.moveId, moveId),
            isNull(moveInvitations.acceptedAt),
            gt(moveInvitations.expiresAt, now),
          ),
        )
        .orderBy(asc(moveInvitations.createdAt))
    : [];

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const invitations = invitationRows
    .filter((i) => !i.expiresAt || i.expiresAt > now)
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      url: `${proto}://${host}/invites/${i.token}`,
      expiresAt: i.expiresAt.toISOString(),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">
          Share this move with family or day-of helpers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">People with access</CardTitle>
          <CardDescription>
            {members.length === 1
              ? "It's just you. Invite someone to help plan or pack."
              : `${members.length} people on this move.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersList moveId={moveId} members={members} canManage={canManage} />
        </CardContent>
      </Card>

      {canManage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite someone</CardTitle>
              <CardDescription>
                Create a link and share it however you like — text, email, AirDrop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm moveId={moveId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending invitations</CardTitle>
              <CardDescription>
                Active links that haven&apos;t been accepted yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitations
                invitations={invitations}
                canManage={canManage}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <div>
          <Separator />
          <p className="pt-4 text-sm text-muted-foreground">
            Only the move owner can invite or remove members.
          </p>
        </div>
      )}
    </div>
  );
}
