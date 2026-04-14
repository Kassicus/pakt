import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/app/AuthForms";

export const metadata = {
  title: "Sign in — pakt",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        pakt
      </Link>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
