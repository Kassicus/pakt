import Link from "next/link";
import { getUserIdOrNull } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Box, Camera, QrCode, Truck } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Inventory everything",
    body: "Walk your house, snap photos, log every item. Pick a category and pakt estimates the volume and weight.",
  },
  {
    icon: Box,
    title: "Decide once, then pack",
    body: "Every item gets a disposition — moving, storage, donate, or trash. Undecided? Run a quick keep/donate check.",
  },
  {
    icon: Truck,
    title: "Predict boxes + trucks",
    body: "pakt tallies your moving pile, recommends how many of each box size, and picks the right rental truck.",
  },
  {
    icon: QrCode,
    title: "QR every box",
    body: "Print labels, tape on the box, scan at the destination. No more opening five boxes to find the coffee maker.",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getUserIdOrNull();
  const isSignedIn = Boolean(userId);

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-5xl px-6 py-24 md:py-32">
        <Badge variant="secondary" className="mb-6 font-mono text-xs tracking-wide">
          BETA
        </Badge>
        <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
          Move out without losing your mind.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          pakt turns a move from a pile of garbage bags into a plan.
          Inventory every item, decide what goes, label every box, and find anything in seconds at the other end.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {isSignedIn ? (
            <Link href="/moves" className={buttonVariants({ size: "lg" })}>
              Open pakt <ArrowRight className="ml-2 size-4" />
            </Link>
          ) : (
            <>
              <Link href="/auth/sign-up" className={buttonVariants({ size: "lg" })}>
                Start packing <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link href="/auth/sign-in" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent/30"
          >
            <f.icon className="size-5 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
