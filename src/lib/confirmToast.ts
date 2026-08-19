import { toast } from "sonner";

export function confirmToast(
  message: string,
  onConfirm: () => void | Promise<void>,
  actionLabel = "Eliminar",
) {
  toast(message, {
    style: {
      background: "#13151c",
      border: "1px solid rgba(239, 68, 68, 0.25)",
      color: "rgba(255,255,255,0.85)",
      borderRadius: "0.75rem",
      padding: "12px 16px",
    },
    actionButtonStyle: {
      background: "rgba(239, 68, 68, 0.15)",
      color: "rgb(248, 113, 113)",
      border: "1px solid rgba(239, 68, 68, 0.25)",
      borderRadius: "0.5rem",
      fontWeight: "500",
    },
    cancelButtonStyle: {
      background: "transparent",
      color: "rgba(255,255,255,0.35)",
      borderRadius: "0.5rem",
    },
    action: {
      label: actionLabel,
      onClick: onConfirm,
    },
    cancel: { label: "Cancelar", onClick: () => {} },
  });
}
