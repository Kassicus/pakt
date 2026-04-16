import { requireUserId } from "@/lib/auth";
import { DeepLinkRouter } from "@/components/app/DeepLinkRouter";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserId();
  return (
    <>
      {children}
      <DeepLinkRouter />
    </>
  );
}
