import { User } from "@/app/(dashboard)/users/page";
import { Pencil, Trash2 } from "lucide-react";

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-500/20 text-purple-400",
  SUPERVISOR: "bg-blue-500/20 text-blue-400",
  COACH: "bg-amber-500/20 text-amber-400",
  AGENT: "bg-green-500/20 text-green-400",
};

interface Props {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
}

export function UserTable({ users, onEdit, onDelete }: Props) {
  return (
    <div className="bg-[#13151c] rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {[
              "Usuario",
              "Nombre",
              "Rol",
              "Empresa",
              "Equipo",
              "Estado",
              "Acciones",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 text-sm text-white/70">
                {user.username}
              </td>
              <td className="px-4 py-3 text-sm text-white font-medium">
                {user.name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[user.role]}`}
                >
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-white/50">
                {user.company?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm text-white/50">
                {user.team?.name ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${user.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {user.active ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="text-center py-12 text-white/30 text-sm">
          No hay usuarios registrados
        </div>
      )}
    </div>
  );
}
