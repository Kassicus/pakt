import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/app/AuthForms";

export const metadata = {
  title: "Sign in — pakt",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          pakt
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <SignInForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/auth/sign-up" className="text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
