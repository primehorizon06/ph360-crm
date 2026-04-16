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
      <div className="flex h-screen bg-[#0f1117] text-white">
        <Sidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
      <Toaster position="top-right" richColors closeButton theme="dark" />
    </SidebarProvider>
  );
}
