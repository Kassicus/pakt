import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { QrScanner } from "@/components/app/QrScanner";

export default async function PackLauncherPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Scan a box</h1>
        <p className="mt-1 text-muted-foreground">
          Aim your camera at a printed QR label to start packing, or unpacking at the destination.
        </p>
      </div>

      <QrScanner moveId={moveId} />

      <Card>
        <CardHeader>
          <CardTitle>No printed label yet?</CardTitle>
          <CardDescription>
            Create a box first, print its label, then come back here to scan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href={`/${moveId}/boxes/new`} className={buttonVariants()}>
            New box
          </Link>
          <Link href={`/${moveId}/labels`} className={buttonVariants({ variant: "secondary" })}>
            Print labels
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
