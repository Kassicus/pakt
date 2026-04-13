import { requireSession } from "@/lib/auth";
import { AppHeader } from "@/components/app/AppHeader";

export default async function MovesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader session={session} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
