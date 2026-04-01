"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, LucideIcon, Users } from "lucide-react";

const navItems: {
  label: string;
  icon: LucideIcon;
  href: string;
  roles?: string[];
}[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Usuarios", icon: Users, href: "/users", roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-56 bg-[#13151c] flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="h-14 p-4 border-b border-white/10">
        <div>
          <p className="text-white text-center font-semibold text-sm leading-none">
            PH360 CRM
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter(
            (item) =>
              !item.roles || item.roles.includes(session?.user?.role ?? ""),
          )
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="text-[18px]" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
