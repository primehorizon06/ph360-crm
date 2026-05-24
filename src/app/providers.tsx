"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { toast } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60}>
      <SWRConfig value={{ onError: (err: Error) => toast.error(err.message ?? "Error al cargar datos") }}>
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
