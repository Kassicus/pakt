"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth/client";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.55 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.12A6.98 6.98 0 0 1 5.47 12c0-.73.13-1.45.37-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.08 14.97 1 12 1 7.7 1 3.99 3.45 2.18 7.04l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackURL = searchParams.get("next") ?? "/moves";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  async function signInWithGoogle() {
    try {
      await authClient.signIn.social({ provider: "google", callbackURL });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await authClient.signIn.email({ email, password });
        const err = (result as { error?: { message?: string } }).error;
        if (err) {
          toast.error(err.message ?? "Sign-in failed");
          return;
        }
        router.push(callbackURL);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-in failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={isPending}
      >
        <GoogleLogo />
        <span className="ml-2">Continue with Google</span>
      </Button>

      <div className="relative py-1">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
      </div>

      <form onSubmit={onEmailSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}

export function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackURL = searchParams.get("next") ?? "/moves";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  async function signInWithGoogle() {
    try {
      await authClient.signIn.social({ provider: "google", callbackURL });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-up failed");
    }
  }

  function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        const err = (result as { error?: { message?: string } }).error;
        if (err) {
          toast.error(err.message ?? "Sign-up failed");
          return;
        }
        router.push(callbackURL);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-up failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={isPending}
      >
        <GoogleLogo />
        <span className="ml-2">Continue with Google</span>
      </Button>

      <div className="relative py-1">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
      </div>

      <form onSubmit={onEmailSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </div>
  );
}
