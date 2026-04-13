import { requireUserId } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserId();
  return <>{children}</>;
}
