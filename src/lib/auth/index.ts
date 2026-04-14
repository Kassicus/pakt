import { redirect } from "next/navigation";
import { auth, currentUser } from "./server";

export { auth, currentUser } from "./server";

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");
  return userId;
}

export async function getUserIdOrNull(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function requireSession(): Promise<{
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
}> {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");
  const user = await currentUser();
  if (!user) redirect("/auth/sign-in");
  return {
    userId,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    name: user.fullName,
    image: user.imageUrl ?? null,
  };
}
