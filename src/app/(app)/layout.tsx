import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { UserMenu } from "@/components/app/UserMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/moves" className="font-semibold tracking-tight">
            pakt
          </Link>
          <UserMenu email={session.email} name={session.name} image={session.image} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
