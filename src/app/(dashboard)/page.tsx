"use client";

import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const { hasPermission, user, isLoading } = usePermissions();
  const router = useRouter();

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return router.push("/auth/login");
  }

  return (
    <div className="flex w-full h-full pt-12 px-2 sm:px-8 justify-center items-start">
      <div className="flex-1 max-w-4xl border-4 border-dashed border-gray-200 rounded-lg p-8 shadow-xl bg-transparent">
        <h2 className="text-3xl font-bold mb-4">Dashboard</h2>
        <p className="mb-1">Bienvenido, <span className="font-semibold">{user?.name}</span></p>
        <p className="mb-1">Rol: <span className="font-semibold">{user?.role}</span></p>
        <p className="mb-1">Compañía: <span className="font-semibold">{user?.companyName}</span></p>
        {user?.teamName && <p className="mb-1">Equipo: <span className="font-semibold">{user?.teamName}</span></p>}

        {/* Ejemplo de uso de permisos */}
        <div className="mt-6 p-4 bg-gray-900/60 rounded">
          <h3 className="font-semibold mb-2 text-gray-200">Permisos de ejemplo:</h3>
          <button
            onClick={async () => {
              const canCreateLead = await hasPermission("leads", "create");
              console.log("Puede crear leads:", canCreateLead);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-lg font-medium transition"
          >
            Verificar permiso para crear leads
          </button>
        </div>
      </div>
    </div>
  );
}
