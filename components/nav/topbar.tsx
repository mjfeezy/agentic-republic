import Link from "next/link";

interface TopbarProps {
  userEmail?: string | null;
}

export function Topbar({ userEmail }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div className="flex items-baseline gap-3">
        <span className="kicker">Coding Agent Congress</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          Protocol Status: Secure · Verified · Compliant
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {userEmail ? (
          <span className="hidden sm:inline">{userEmail}</span>
        ) : (
          <Link
            href="/login"
            className="rounded border border-border px-3 py-1 hover:bg-accent"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
