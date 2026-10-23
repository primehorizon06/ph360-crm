"use client";

import { useState } from "react";
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
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);

  const compact = collapsed && !mobileOpen;

  const role = session?.user?.role ?? "";
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  function showTooltip(label: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  }

  function tooltipProps(label: string) {
    if (!compact) return {};
    return {
      "aria-label": label,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showTooltip(label, e.currentTarget),
      onFocus: (e: React.FocusEvent<HTMLElement>) => showTooltip(label, e.currentTarget),
      onMouseLeave: () => setTooltip(null),
      onBlur: () => setTooltip(null),
    };
  }

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
          ${compact ? "w-16" : "w-56"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div
          className={`h-14 border-b border-white/10 flex items-center gap-2 ${
            compact ? "justify-center" : "pl-6 pr-4 justify-between"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src={logo}
              alt={compact ? "PH360 CRM" : ""}
              width={compact ? 28 : 32}
              height={compact ? 14 : 16}
              priority
              className="shrink-0"
            />
            {!compact && (
              <p className="text-white font-semibold text-lg leading-none truncate">
                PH360 CRM
              </p>
            )}
          </div>
          {/* Cerrar en móvil */}
          {!compact && (
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
          onScroll={() => setTooltip(null)}
          className="flex-1 p-3 overflow-y-auto"
        >
          {visibleGroups.map((group, groupIdx) => {
            const headingId = group.label ? `nav-group-${groupIdx}` : undefined;
            const showHeading = group.label && !compact;
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
                {group.label && compact && (
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
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          {...tooltipProps(item.label)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg transition-colors ${
                            compact ? "justify-center" : ""
                          } ${
                            isActive
                              ? "bg-tertiary/10 text-tertiary"
                              : "text-white/90 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <Icon size={18} aria-hidden="true" />
                          {!compact && item.label}
                        </Link>
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
            <button
              onClick={() => setLeadsModalOpen(true)}
              {...tooltipProps("Nuevo Lead")}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/20 w-full transition-colors ${compact ? "justify-center" : ""}`}
            >
              <Plus size={18} aria-hidden="true" />
              {!compact && "Nuevo Lead"}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            {...tooltipProps("Cerrar Sesión")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg text-error/70 hover:text-error hover:bg-error/10 w-full transition-colors ${compact ? "justify-center" : ""}`}
          >
            <LogOut size={18} aria-hidden="true" />
            {!compact && "Cerrar Sesión"}
          </button>
        </div>

        {compact && tooltip && (
          <div
            aria-hidden="true"
            style={{ top: tooltip.top }}
            className="fixed left-[4.5rem] -translate-y-1/2 px-2 py-1 bg-surface-container border border-white/10 rounded-lg text-sm text-white whitespace-nowrap pointer-events-none z-50"
          >
            {tooltip.label}
          </div>
        )}
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
