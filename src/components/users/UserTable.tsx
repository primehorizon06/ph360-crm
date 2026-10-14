import { User } from "@/app/(dashboard)/users/page";
import { Pencil } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { ROLE_COLORS, roleLabel } from "@/utils/constants/roles";
import { Role } from "@prisma/client";

const TABLE_HEADERS = [
  "ID",
  "Usuario",
  "Nombre",
  "Rol",
  "Franquicia",
  "Equipo",
  "Status",
  "Acciones",
];

interface Props {
  users: User[];
  onEdit: (user: User) => void;
  onToggleActive: (user: User) => void;
}

export function UserTable({ users, onEdit, onToggleActive }: Props) {
  return (
    <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
      {/* Vista desktop — tabla */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-sm text-on-surface-variant font-medium uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-lg text-white/90">
                  {user.id}
                </td>
                <td className="px-4 py-3 text-lg text-white/70">
                  {user.username}
                </td>
                <td className="px-4 py-3 text-lg text-white font-medium">
                  {user.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-sm px-2 py-1 rounded-full font-medium ${ROLE_COLORS[user.role as Role] ?? "bg-white/10 text-white/90"}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-lg text-white/90">
                  {user.company?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-lg text-white/90">
                  {user.team?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={user.active}
                    onChange={() => onToggleActive(user)}
                    label={user.active ? "Activo" : "Inactivo"}
                    aria-label={`${user.active ? "Desactivar" : "Activar"} a ${user.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista móvil — tarjetas */}
      <div className="md:hidden divide-y divide-white/5">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold text-lg shrink-0">
                {user.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-lg truncate">
                  {user.name}
                </p>
                <p className="text-on-surface-variant text-sm">{user.username}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span
                    className={`text-sm px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role as Role] ?? "bg-white/10 text-white/90"}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </div>
                {user.company?.name && (
                  <p className="text-white/90 text-sm mt-1">
                    {user.company.name}{" "}
                    {user.team?.name ? `· ${user.team.name}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(user)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
              >
                <Pencil size={14} />
              </button>
              <Switch
                checked={user.active}
                onChange={() => onToggleActive(user)}
                aria-label={`${user.active ? "Desactivar" : "Activar"} a ${user.name}`}
              />
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-white/90 text-lg">
          No hay usuarios registrados
        </div>
      )}
    </div>
  );
}
