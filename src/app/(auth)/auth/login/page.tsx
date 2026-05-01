"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Iniciar Sesión | PH360 CRM";
  }, []);

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      toast.error("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
      // Limpiar la URL sin recargar la página
      window.history.replaceState({}, "", "/auth/login");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales inválidas");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setError("Error al iniciar sesión");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Loading fullScreen={true} message="Cargando..." />;

  return (
    <main className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center selection:bg-tertiary/30r">
      <div className="elative z-10 w-full max-w-[420px] px-6">
        <div className="text-center mb-10">
          <h1 className="font-headline font-extrabold text-3xl tracking-tighter text-on-surface mb-1">
            PH360 CRM
          </h1>
        </div>
        <div className="glass-card rounded-xl p-8 shadow-2xl border border-outline-variant/10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant px-1"
                htmlFor="username"
              >
                Nombre de usuario
              </label>
              <div className="relative group">
                <input
                  className="w-full bg-surface-container-highest border-0 border-b border-outline-variant/30 text-on-surface py-3 px-4 rounded-t-lg transition-all input-focus-glow placeholder:text-on-surface-variant/40"
                  id="username"
                  name="username"
                  placeholder="Usuario"
                  type="text"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label
                  className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant"
                  htmlFor="password"
                >
                  Contraseña
                </label>
              </div>
              <div className="relative group">
                <input
                  className="w-full bg-surface-container-highest border-0 border-b border-outline-variant/30 text-on-surface py-3 px-4 rounded-t-lg transition-all input-focus-glow placeholder:text-on-surface-variant/40"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-lg text-center">{error}</div>
            )}
            <button
              className="w-full btn-satin py-4 rounded-lg font-headline font-bold text-on-primary tracking-tight text-lg flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform shadow-lg shadow-primary-container/20 cursor-pointer pointer-events-auto disabled:opacity-50 disabled:pointer-events-none"
              type="submit"
              disabled={isLoading}
            >
              <span>Iniciar sesión</span>
            </button>
          </form>
        </div>
        <footer className="mt-12 flex flex-col items-center space-y-4">
          <p className="text-[10px] text-on-surface-variant/40 font-body">
            © 2026 Prime Horizon 360 INC. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </main>
  );
}
