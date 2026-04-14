import Link from "next/link";
import { Suspense } from "react";
import { SignUpForm } from "@/components/app/AuthForms";

export const metadata = {
  title: "Create account — pakt",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        pakt
      </Link>
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
