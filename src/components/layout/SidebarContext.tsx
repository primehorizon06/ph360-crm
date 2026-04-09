"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
  leadsModalOpen: boolean;
  setLeadsModalOpen: (val: boolean) => void;
  onLeadCreated: (() => void) | null;
  setOnLeadCreated: (fn: (() => void) | null) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  leadsModalOpen: false,
  setLeadsModalOpen: () => {},
  onLeadCreated: null,
  setOnLeadCreated: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [onLeadCreated, setOnLeadCreated] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
        leadsModalOpen,
        setLeadsModalOpen,
        onLeadCreated,
        setOnLeadCreated,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
