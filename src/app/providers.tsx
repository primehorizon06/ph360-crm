"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { swrErrorToast } from "@/lib/swrErrorToast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60}>
      <SWRConfig value={swrErrorToast}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            style: { width: "26rem", maxWidth: "90vw" },
            classNames: {
              title: "text-lg!",
              description: "text-base!",
              icon: "w-6! h-6! [&>svg]:w-6! [&>svg]:h-6!",
            },
          }}
        />
      </SWRConfig>
    </SessionProvider>
  );
}
