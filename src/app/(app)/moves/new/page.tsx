import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createMove } from "@/actions/moves";

export default function NewMovePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New move</h1>
        <p className="mt-1 text-muted-foreground">
          Tell pakt about your move. We&apos;ll set up default rooms — you can edit them next.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Only the name is required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createMove} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Move name</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={120}
                placeholder="Oakland → Portland, June 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedMoveDate">Planned move date</Label>
              <Input id="plannedMoveDate" name="plannedMoveDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originAddress">From</Label>
              <Input id="originAddress" name="originAddress" placeholder="Current address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinationAddress">To</Label>
              <Input id="destinationAddress" name="destinationAddress" placeholder="New address" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/moves" className={buttonVariants({ variant: "ghost" })}>
                Cancel
              </Link>
              <Button type="submit">Create move</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
