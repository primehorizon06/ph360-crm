import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// Agrega este componente en el mismo archivo o en src/components/ui/Select.tsx
export function CustomSelect({
  name,
  value,
  onChange,
  options,
  labels
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 flex items-center justify-between"
      >
        {value}
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e2030] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {options.map((option, i) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left transition-colors hover:bg-white/5 ${value === option ? "text-cyan-400" : "text-white/70"}`}
            >
              {labels?.[i] ?? option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
