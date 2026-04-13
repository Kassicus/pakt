"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Archive, Heart, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { scoreDecision, type DecisionInputs } from "@/lib/predictions";
import { saveDecision } from "@/actions/items";
import type { Disposition } from "@/lib/validators";

export function DecisionQuiz({
  itemId,
  moveId,
  itemName,
  initial,
}: {
  itemId: string;
  moveId: string;
  itemName: string;
  initial: DecisionInputs;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastUsed, setLastUsed] = useState<number | null>(
    initial.lastUsedMonths ?? 6,
  );
  const [replacement, setReplacement] = useState<string>(
    initial.replacementCostUsd !== undefined
      ? String(initial.replacementCostUsd)
      : "",
  );
  const [sentimental, setSentimental] = useState<boolean | null>(
    initial.sentimental ?? null,
  );
  const [buyAgain, setBuyAgain] = useState<DecisionInputs["wouldBuyAgain"] | null>(
    initial.wouldBuyAgain ?? null,
  );

  const answers: DecisionInputs = useMemo(() => {
    const parsedCost = replacement.trim() === "" ? undefined : Number(replacement);
    return {
      lastUsedMonths: lastUsed ?? undefined,
      replacementCostUsd: Number.isFinite(parsedCost) ? parsedCost : undefined,
      sentimental: sentimental ?? undefined,
      wouldBuyAgain: buyAgain ?? undefined,
    };
  }, [lastUsed, replacement, sentimental, buyAgain]);

  const result = useMemo(() => scoreDecision(answers), [answers]);

  function submit(apply?: Disposition) {
    startTransition(async () => {
      try {
        await saveDecision({ itemId, answers, apply });
        toast.success(apply ? `Saved and applied: ${apply}` : "Saved");
        if (apply) {
          router.push(`/${moveId}/triage`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>How long since you used it?</CardTitle>
            <CardDescription>
              {lastUsed === null
                ? "Skip this question if you don't know."
                : describeMonths(lastUsed)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={lastUsed !== null ? [lastUsed] : [0]}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v;
                if (typeof next === "number") setLastUsed(next);
              }}
              min={0}
              max={60}
              step={1}
              className="mt-2"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Today</span>
              <span>This week</span>
              <span>A year</span>
              <span>5+ years</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What would it cost to replace?</CardTitle>
            <CardDescription>Rough guess in USD.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={10}
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                className="pl-6"
                placeholder="50"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Any sentimental value?</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Switch
              checked={sentimental === true}
              onCheckedChange={(v) => setSentimental(Boolean(v))}
              id="sentimental"
            />
            <Label htmlFor="sentimental" className="cursor-pointer">
              {sentimental ? "Yes, it means something" : "Nope"}
            </Label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Would you buy this again today?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(["yes", "unsure", "no"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBuyAgain(opt)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                    buyAgain === opt
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.recommendation === "keep" && (
              <CheckCircle2 className="size-5 text-emerald-500" />
            )}
            {result.recommendation === "donate" && (
              <Heart className="size-5 text-violet-500" />
            )}
            {result.recommendation === "toss_up" && (
              <HelpCircle className="size-5 text-muted-foreground" />
            )}
            {verdictLabel(result.recommendation)} for &ldquo;{itemName}&rdquo;
          </CardTitle>
          <CardDescription>
            Score {result.score.toFixed(2)} · {result.reasons.join(" · ") || "No answers yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => submit("moving")} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              Apply: Move
            </Button>
            <Button onClick={() => submit("storage")} disabled={isPending} variant="secondary">
              <Archive className="mr-2 size-4" /> Apply: Store
            </Button>
            <Button onClick={() => submit("donate")} disabled={isPending} variant="secondary">
              <Heart className="mr-2 size-4" /> Apply: Donate
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => submit()} disabled={isPending}>
              Save answers only
            </Button>
            <Link
              href={`/${moveId}/triage`}
              className={buttonVariants({ variant: "ghost" })}
            >
              Skip — decide later
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function describeMonths(m: number): string {
  if (m === 0) return "Today";
  if (m === 1) return "About a month ago";
  if (m < 12) return `About ${m} months ago`;
  if (m < 24) return "About a year ago";
  if (m < 60) return `About ${Math.round(m / 12)} years ago`;
  return "5+ years ago";
}

function verdictLabel(r: "keep" | "donate" | "toss_up"): string {
  if (r === "keep") return "Recommendation: keep";
  if (r === "donate") return "Recommendation: donate";
  return "Too close to call";
}
