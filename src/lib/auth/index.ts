import { redirect } from "next/navigation";
import { auth } from "./server";

export { auth } from "./server";

export async function requireUserId(): Promise<string> {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in");
  return data.user.id;
}

export async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await auth.getSession();
  return data?.user?.id ?? null;
}

export async function requireSession(): Promise<{
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
}> {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in");
  return {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name ?? null,
    image: (data.user as { image?: string | null }).image ?? null,
  };
}
