import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "@/components/app/AuthForms";

export const metadata = {
  title: "Create account — pakt",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          pakt
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Start packing</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <SignUpForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
