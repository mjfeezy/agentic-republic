"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  IdCard,
  Library,
  PackageSearch,
  ShieldCheck,
  AlertOctagon,
  Gavel,
  ScrollText,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/civic/logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stations", label: "Stations", icon: Building2 },
  { href: "/representatives", label: "Representatives", icon: Users },
  { href: "/passports", label: "Passports", icon: IdCard },
  { href: "/institutions", label: "Institutions", icon: Library },
  { href: "/packets", label: "Civic Packets", icon: PackageSearch },
  { href: "/port-of-entry", label: "Port of Entry", icon: ShieldCheck },
  { href: "/quarantine", label: "Quarantine", icon: AlertOctagon },
  { href: "/ratification", label: "Ratification", icon: Gavel },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/roadmap", label: "Roadmap", icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/">
          <Wordmark size="sm" />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname?.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-civic-ink/10 text-civic-ink font-medium"
                      : "text-muted-foreground hover:bg-civic-ink/5 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-civic-teal" : "",
                    )}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto border-t px-6 py-4">
        <p className="brand-imprint">Governance · Protocol · Trust</p>
        <p className="mt-1 text-[11px] text-muted-foreground">By design.</p>
      </div>
    </aside>
  );
}
