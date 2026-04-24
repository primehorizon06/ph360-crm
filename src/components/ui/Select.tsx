"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

export function CustomSelect({
  name,
  value,
  onChange,
  options,
  labels,
  searchable = false,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: string[];
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // Verificar si el click fue fuera del botón Y fuera del dropdown del portal
      const dropdownEl = document.getElementById(`dropdown-${name}`);
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownEl &&
        !dropdownEl.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [name]);

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        right: viewportWidth - rect.right,
        minWidth: rect.width,
        width: "max-content",
        maxWidth: "240px",
        zIndex: 9999,
      });
    }
    setOpen(!open);
    setSearch("");
  }

  const filteredOptions = options.filter((_, i) => {
    const label = labels?.[i] ?? options[i];
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 flex items-center justify-between"
      >
        <span className="truncate">
          {labels?.[options.indexOf(value)] ?? value}
        </span>
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={`dropdown-${name}`}
            style={dropdownStyle}
            className="bg-[#1e2030] border border-white/10 rounded-lg overflow-hidden shadow-xl"
          >
            {/* Buscador opcional */}
            {searchable && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                <Search size={14} className="text-white/40 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none w-full"
                />
              </div>
            )}

            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-white/30">
                  Sin resultados
                </p>
              ) : (
                filteredOptions.map((option, i) => {
                  const originalIndex = options.indexOf(option);
                  const label = labels?.[originalIndex] ?? option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full px-3 py-2 text-sm text-left transition-colors hover:bg-white/5 ${
                        value === label ? "text-cyan-400" : "text-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
