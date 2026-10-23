import { useEffect } from "react";
import {
  mutate,
  unstable_serialize,
  type Middleware,
  type SWRConfiguration,
} from "swr";
import { toast } from "sonner";

const shownErrors = new Map<string, string>();

function clearError(key: string) {
  if (!shownErrors.delete(key)) return;
  toast.dismiss(key);
}

const clearOnRelease: Middleware = (useSWRNext) =>
  function useClearErrorOnRelease(key, fetcher, config) {
    const serialized = unstable_serialize(key);
    useEffect(() => () => clearError(serialized), [serialized]);
    return useSWRNext(key, fetcher, config);
  };

export const swrErrorToast: SWRConfiguration = {
  use: [clearOnRelease],
  onError: (err: Error, key: string) => {
    const message = err?.message || "Error al cargar datos";
    if (shownErrors.get(key) === message) return;
    shownErrors.set(key, message);
    toast.error(message, {
      id: key,
      duration: Infinity,
      action: {
        label: "Reintentar",
        onClick: () => {
          shownErrors.delete(key);
          void mutate(key);
        },
      },
    });
  },
  onSuccess: (_data: unknown, key: string) => clearError(key),
};
