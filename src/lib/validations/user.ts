import { z } from "zod";

const baseSchema = z
  .object({
    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(20, "Máximo 20 caracteres")
      .regex(
        /^[a-z0-9._]+$/,
        "Solo letras minúsculas, números, puntos y guiones bajos",
      ),
    name: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(50, "Máximo 50 caracteres"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    role: z.enum(["ADMIN", "SUPERVISOR", "COACH", "AGENT"]),
    companyId: z.string().min(1, "La franquicia es requerida"),
    teamId: z.string().min(1, "El equipo es requerido"),
    active: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.password && data.password !== data.confirmPassword) return false;
      return true;
    },
    {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    },
  );

export const userSchema = baseSchema;

export const createUserSchema = baseSchema.refine(
  (data) => {
    if (!data.password) return false;
    return true;
  },
  {
    message: "La contraseña es requerida",
    path: ["password"],
  },
);

export type UserFormData = z.infer<typeof baseSchema>;
