"use client";

import { useSidebar } from "@/context/SidebarContext";
import { Header } from "./Header";

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={`flex flex-col flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-56"}`}
    >
      <Header />
      <main className="flex-1 overflow-y-auto p-6 mt-14">{children}</main>
    </div>
  );
}
