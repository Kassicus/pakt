import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserIdOrNull } from "@/lib/auth";
import { getInvitationPreview } from "@/actions/members";
import { AcceptInviteButton } from "@/components/app/AcceptInviteButton";

export const dynamic = "force-dynamic";

const roleLabels = {
  owner: "an owner",
  editor: "an editor",
  helper: "a helper",
} as const;

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);
  const userId = await getUserIdOrNull();

  if (!preview) {
    return <ErrorState title="Invitation not found" body="This link doesn't match any invitation." />;
  }
  if (preview.state === "expired") {
    return <ErrorState title="Invitation expired" body="Ask the move owner to send a new invite." />;
  }
  if (preview.state === "accepted") {
    return <ErrorState title="Already accepted" body="This invitation has already been used." />;
  }

  let inviterName = "Someone";
  try {
    const client = await clerkClient();
    const inviter = await client.users.getUser(preview.inviterUserId);
    inviterName = inviter.fullName?.trim() ||
      inviter.primaryEmailAddress?.emailAddress ||
      "Someone";
  } catch {
    // Fall back to the generic name.
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You&apos;ve been invited to a move</CardTitle>
          <CardDescription>
            <strong className="text-foreground">{inviterName}</strong> invited you to{" "}
            <strong className="text-foreground">{preview.moveName}</strong> as{" "}
            {roleLabels[preview.role]}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {userId ? (
            <AcceptInviteButton token={token} />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sign in or create an account to accept.
              </p>
              <div className="grid gap-2">
                <Link
                  href={`/auth/sign-in?next=/invites/${token}`}
                  className={buttonVariants()}
                >
                  Sign in
                </Link>
                <Link
                  href={`/auth/sign-up?next=/invites/${token}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Create account
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Go home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
