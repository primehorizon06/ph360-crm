"use client";

import { Search, Bell, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { Avatar } from "../ui/Avatar";
import { useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <header
      className={`fixed top-0 right-0 ${collapsed ? "md:left-16" : "md:left-56"} left-0 h-14 bg-[#13151c]/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-40 transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        {/* Hamburguesa móvil */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white/50 hover:text-white transition-colors md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Búsqueda */}
        <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 w-64">
          <Search size={16} className="text-white/40" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none w-full"
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-4">
        <button className="relative text-white/50 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-white font-medium leading-none">
              {session?.user?.name}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {session?.user?.role}
            </p>
          </div>
          <Avatar
            name={session?.user?.name}
            avatar={session?.user?.avatar}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}
