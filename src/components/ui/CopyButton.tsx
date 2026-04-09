import { useState } from "react";
import { Copy, Check } from "lucide-react";

type CopyButtonProps = {
  value: string | number;
  label?: string;
  className?: string;
};

export const CopyButton = ({
  value,
  label,
  className = "",
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={label || "Copiar"}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-white/10 hover:bg-white/20 transition ${className}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copiado" : label || "Copiar"}</span>
    </button>
  );
};
