"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { Avatar } from "../ui/Avatar";
import { useSession } from "next-auth/react";
import { NotificationBell } from "../notifications/NotificationBell";
import { NotificationHandler } from "../notifications/NotificationHandler";
import { ToastHandler } from "../notifications/ToastHandler";
import { useHeaderSearch } from "@/hooks/useHeaderSearch";

export function Header() {
  const { data: session } = useSession();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const { results, loading } = useHeaderSearch(query);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResult(result: (typeof results)[number]) {
    setOpen(false);
    setQuery("");
    router.push(result.type === "customer" ? `/customers/${result.id}` : `/leads/${result.id}`);
  }

  return (
    <>
      <header
        className={`fixed top-0 right-0 ${collapsed ? "md:left-16" : "md:left-56"} left-0 h-14 bg-surface/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-40 transition-all duration-300`}
      >
        <div className="flex items-center gap-3">
          {/* Hamburguesa móvil */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white/90 hover:text-white transition-colors md:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Búsqueda */}
          <div ref={searchBoxRef} className="relative hidden sm:block">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 w-64">
              <Search size={16} className="text-on-surface-variant" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Buscar"
                className="bg-transparent text-lg text-white/70 placeholder:text-white/90 outline-none w-full"
              />
            </div>

            {open && query.trim().length >= 2 && (
              <div className="absolute top-full mt-1 left-0 w-80 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {loading && (
                  <p className="px-3 py-2 text-sm text-on-surface-variant">Buscando...</p>
                )}
                {!loading && results.length === 0 && (
                  <p className="px-3 py-2 text-sm text-on-surface-variant">
                    Sin resultados
                  </p>
                )}
                {!loading &&
                  results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => goToResult(result)}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <p className="text-sm text-white font-medium">
                        {result.firstName} {result.lastName ?? ""}
                        <span className="ml-2 text-xs text-on-surface-variant">
                          #{result.id} · {result.type === "customer" ? "Cliente" : "Lead"}
                        </span>
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {result.phone1}
                        {result.city ? ` · ${result.city}` : ""}
                      </p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          {/* <button className="relative text-white/90 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full"></span>
        </button> */}
          <NotificationBell />
          <div className="flex items-center gap-2 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-lg text-white font-medium leading-none">
                {session?.user?.name}
              </p>
              <p className="text-sm text-on-surface-variant mt-0.5">
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
      <NotificationHandler />
      <ToastHandler />
    </>
  );
}
