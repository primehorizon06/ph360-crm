"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  LucideIcon,
  UserSearch,
  UserCheck,
  UserCog,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
  Package,
  Target,
  Wallet,
} from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { LeadModal } from "../leads/LeadModal";
import { UserRole } from "@/utils/constants/roles";
import { canCreateLead } from "@/lib/permissions";
import logo from "@/assets/logo.svg";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  roles?: string[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/" }],
  },
  {
    label: "Comercial",
    items: [
      { label: "Leads", icon: UserSearch, href: "/leads" },
      { label: "Clientes", icon: UserCheck, href: "/customers" },
      {
        label: "Metas",
        icon: Target,
        href: "/goals",
        roles: [UserRole.ADMIN, UserRole.SUPERVISOR],
      },
    ],
  },
  {
    label: "Finanzas",
    items: [
      {
        label: "Cobros",
        icon: Wallet,
        href: "/collections",
        roles: [UserRole.ADMIN, UserRole.CUSTOMER_SERVICE_HOLDING],
      },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Usuarios", icon: UserCog, href: "/users", roles: [UserRole.ADMIN] },
      { label: "Franquicias", icon: Building2, href: "/companies", roles: [UserRole.ADMIN] },
      { label: "Productos", icon: Package, href: "/products", roles: [UserRole.ADMIN] },
      { label: "Auditoría", icon: ShieldCheck, href: "/audit", roles: [UserRole.ADMIN] },
    ],
  },
];

function CollapsedTooltip({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-surface-container border border-white/10 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-50"
    >
      {label}
    </div>
  );
}

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
    onLeadCreated,
  } = useSidebar();

  const role = session?.user?.role ?? "";
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          bg-surface flex flex-col h-dvh fixed left-0 top-0 z-50 transition-all duration-300 overflow-visible
          ${collapsed ? "w-16" : "w-56"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div
          className={`h-14 border-b border-white/10 flex items-center gap-2 ${
            collapsed ? "justify-center" : "pl-6 pr-4 justify-between"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src={logo}
              alt={collapsed ? "PH360 CRM" : ""}
              width={collapsed ? 28 : 32}
              height={collapsed ? 14 : 16}
              priority
              className="shrink-0"
            />
            {!collapsed && (
              <p className="text-white font-semibold text-lg leading-none truncate">
                PH360 CRM
              </p>
            )}
          </div>
          {/* Cerrar en móvil */}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="text-on-surface-variant hover:text-white transition-colors lg:hidden shrink-0"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          className="hidden lg:flex absolute top-7 -right-3 -translate-y-1/2 z-50 w-6 h-6 items-center justify-center rounded-full bg-surface-container border border-white/15 text-on-surface-variant shadow-md transition-colors hover:text-white hover:border-tertiary/50 focus-visible:outline-2 focus-visible:outline-tertiary after:absolute after:-inset-2 after:content-['']"
        >
          {collapsed ? (
            <ChevronRight size={14} aria-hidden="true" />
          ) : (
            <ChevronLeft size={14} aria-hidden="true" />
          )}
        </button>

        {/* Nav */}
        <nav
          aria-label="Menú principal"
          className={`flex-1 p-3 ${collapsed ? "" : "overflow-y-auto"}`}
        >
          {visibleGroups.map((group, groupIdx) => {
            const headingId = group.label ? `nav-group-${groupIdx}` : undefined;
            const showHeading = group.label && !collapsed;
            return (
              <div
                key={group.label ?? groupIdx}
                role={group.label ? "group" : undefined}
                aria-labelledby={showHeading ? headingId : undefined}
                aria-label={group.label && !showHeading ? group.label : undefined}
                className={groupIdx > 0 ? "mt-4" : ""}
              >
                {showHeading && (
                  <p
                    id={headingId}
                    className="px-3 pb-1 text-sm font-medium uppercase tracking-wider text-outline"
                  >
                    {group.label}
                  </p>
                )}
                {group.label && collapsed && (
                  <div aria-hidden="true" className="mx-2 mb-2 border-t border-white/10" />
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href} className="relative group">
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          aria-label={collapsed ? item.label : undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg transition-colors ${
                            collapsed ? "justify-center" : ""
                          } ${
                            isActive
                              ? "bg-tertiary/10 text-tertiary"
                              : "text-white/90 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <Icon size={18} aria-hidden="true" />
                          {!collapsed && item.label}
                        </Link>
                        {collapsed && <CollapsedTooltip label={item.label} />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {canCreateLead(role) && (
        <div className="px-3 pb-3">
          <div className="relative group">
            <button
              onClick={() => setLeadsModalOpen(true)}
              aria-label={collapsed ? "Nuevo Lead" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/20 w-full transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <Plus size={18} aria-hidden="true" />
              {!collapsed && "Nuevo Lead"}
            </button>
            {collapsed && <CollapsedTooltip label="Nuevo Lead" />}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="relative group">
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              aria-label={collapsed ? "Cerrar Sesión" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg text-error/70 hover:text-error hover:bg-error/10 w-full transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} aria-hidden="true" />
              {!collapsed && "Cerrar Sesión"}
            </button>
            {collapsed && <CollapsedTooltip label="Cerrar Sesión" />}
          </div>
        </div>
      </aside>

      {leadsModalOpen && (
        <LeadModal
          onClose={() => setLeadsModalOpen(false)}
          onSave={() => {
            setLeadsModalOpen(false);
            onLeadCreated?.();
          }}
        />
      )}
    </>
  );
}
