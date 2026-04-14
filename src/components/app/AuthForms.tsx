"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useSearchParams } from "next/navigation";

const appearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "oklch(0.66 0.21 295)",
    colorBackground: "oklch(0.145 0 0)",
    borderRadius: "0.625rem",
  },
} as const;

export function SignInForm() {
  const searchParams = useSearchParams();
  const fallback = searchParams.get("next") ?? "/moves";
  return (
    <SignIn
      appearance={appearance}
      routing="hash"
      signUpUrl="/auth/sign-up"
      fallbackRedirectUrl={fallback}
    />
  );
}

export function SignUpForm() {
  const searchParams = useSearchParams();
  const fallback = searchParams.get("next") ?? "/moves";
  return (
    <SignUp
      appearance={appearance}
      routing="hash"
      signInUrl="/auth/sign-in"
      fallbackRedirectUrl={fallback}
    />
  );
}
