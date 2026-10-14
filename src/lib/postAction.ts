import { toast } from "sonner";

/**
 * POST desde el cliente con el aviso correspondiente: muestra `success` si la
 * respuesta es correcta, o el `error` que devuelve la API (o el de respaldo si
 * la red falla). Nunca lanza; devuelve si salió bien.
 */
export async function postAction(
  url: string,
  body: object | undefined,
  { success, error = "No se pudo completar la acción" }: { success: string; error?: string },
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      ...(body
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    });
  } catch {
    toast.error(`${error}. Revisa tu conexión.`);
    return false;
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    toast.error(json.error ?? error);
    return false;
  }
  toast.success(success);
  return true;
}
