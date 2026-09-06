import { SidebarProvider } from "@/components/layout/SidebarContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/layout/DashboardContent";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh bg-background text-white">
        <Sidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
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
    </SidebarProvider>
  );
}
