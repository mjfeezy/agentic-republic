import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";

interface AppShellProps {
  userEmail?: string | null;
  children: React.ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface ConceptHintProps {
  children: React.ReactNode;
}
export function ConceptHint({ children }: ConceptHintProps) {
  return (
    <div className="mb-6 rounded-md border border-dashed bg-accent/40 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
