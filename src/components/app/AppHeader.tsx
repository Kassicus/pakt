import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { DesktopTopNav } from "./MobileBottomNav";

type Session = {
  email: string;
  name: string | null;
  image: string | null;
};

type Props = {
  session: Session;
  move?: { id: string; name: string };
};

export function AppHeader({ session, move }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
        <Link
          href="/moves"
          className="shrink-0 font-semibold tracking-tight hover:text-foreground"
        >
          pakt
        </Link>
        {move ? (
          <>
            <span className="shrink-0 text-muted-foreground">·</span>
            <Link
              href="/moves"
              className="min-w-0 flex-initial truncate text-sm font-medium text-muted-foreground hover:text-foreground"
              title={move.name}
            >
              {move.name}
            </Link>
          </>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-4">
          {move ? <DesktopTopNav moveId={move.id} /> : null}
          <UserMenu
            email={session.email}
            name={session.name}
            image={session.image}
          />
        </div>
      </div>
    </header>
  );
}
