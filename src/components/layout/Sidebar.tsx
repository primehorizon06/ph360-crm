"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Users,
  UserCog,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { LeadModal } from "../leads/LeadModal";

const navItems: {
  label: string;
  icon: LucideIcon;
  href: string;
  roles?: string[];
}[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Usuarios", icon: UserCog, href: "/users", roles: ["ADMIN"] },
  {
    label: "Franquicias",
    icon: Building2,
    href: "/companies",
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    leadsModalOpen,
    setLeadsModalOpen,
  } = useSidebar();

  return (
    <>
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          bg-[#13151c] flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 overflow-visible
          ${collapsed ? "w-16" : "w-56"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between">
          {!collapsed && (
            <p className="text-white font-semibold text-sm leading-none">
              PH360 CRM
            </p>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`text-white/40 hover:text-white transition-colors hidden md:block ${collapsed ? "mx-auto" : ""}`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {/* Cerrar en móvil */}
          <button
            onClick={() => setMobileOpen(false)}
            className="text-white/40 hover:text-white transition-colors md:hidden ml-auto"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter(
              (item) =>
                !item.roles || item.roles.includes(session?.user?.role ?? ""),
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={18} />
                    {!collapsed && item.label}
                  </Link>

                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[#1e2030] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        <div className="px-3 pb-3">
          <div className="relative group">
            <button
              onClick={() => setLeadsModalOpen(true)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 w-full transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <Plus size={18} />
              {!collapsed && "Nuevo Lead"}
            </button>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[#1e2030] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Nuevo Lead
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="relative group">
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} />
              {!collapsed && "Cerrar Sesión"}
            </button>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[#1e2030] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Cerrar Sesión
              </div>
            )}
          </div>
        </div>
      </aside>

      {leadsModalOpen && (
        <LeadModal
          onClose={() => setLeadsModalOpen(false)}
          onSave={() => setLeadsModalOpen(false)}
        />
      )}
    </>
  );
}
