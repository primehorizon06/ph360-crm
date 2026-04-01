"use client";

import { useSession } from "next-auth/react";
import { Search, Bell } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-14rem)] h-14 bg-[#13151c]/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 z-40">
      {/* Búsqueda */}
      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 w-64">
        <Search />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none w-full"
        />
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-4">
        <button className="relative text-white/50 hover:text-white transition-colors">
          <Bell />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full"></span>
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
          <div className="text-right">
            <p className="text-sm text-white font-medium leading-none">
              {session?.user?.name}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {session?.user?.role}
            </p>
          </div>
          <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
            {session?.user?.name?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
