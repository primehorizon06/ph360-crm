import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL válida"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET es requerido"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const formatted = result.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Variables de entorno inválidas:\n${formatted}`);
}

export const env = result.data;
