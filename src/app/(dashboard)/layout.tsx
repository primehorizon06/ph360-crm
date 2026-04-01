import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-56">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 mt-14">
          {children}
        </main>
      </div>
    </div>
  );
}