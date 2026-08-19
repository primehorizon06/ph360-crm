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
  "aria-label": ariaLabel,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: string[];
  searchable?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = `dropdown-${name}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // Verificar si el click fue fuera del botón Y fuera del dropdown del portal
      const dropdownEl = document.getElementById(listboxId);
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
  }, [listboxId]);

  const filteredOptions = options.filter((_, i) => {
    const label = labels?.[i] ?? options[i];
    return label.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    if (!open) return;
    // Al abrir o al filtrar, resalta la opción seleccionada actual (o la primera).
    // `value` es la etiqueta mostrada, no el id de la opción (así lo usan los callers).
    const currentIndex = filteredOptions.findIndex((opt) => {
      const label = labels?.[options.indexOf(opt)] ?? opt;
      return label === value;
    });
    setHighlighted(currentIndex >= 0 ? currentIndex : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  function openDropdown() {
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
    setOpen(true);
    setSearch("");
  }

  function closeDropdown(focusButton: boolean) {
    setOpen(false);
    setSearch("");
    if (focusButton) buttonRef.current?.focus();
  }

  function selectOption(option: string) {
    onChange(option);
    closeDropdown(true);
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openDropdown();
      return;
    }
    if (open) handleListKeyDown(e);
  }

  function handleListKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>,
  ) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filteredOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        e.preventDefault();
        setHighlighted(filteredOptions.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlighted]) selectOption(filteredOptions[highlighted]);
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown(true);
        break;
      case "Tab":
        closeDropdown(false);
        break;
    }
  }

  useEffect(() => {
    if (open && searchable) searchInputRef.current?.focus();
  }, [open, searchable]);

  const activeOptionId =
    open && filteredOptions[highlighted] ? `${name}-option-${options.indexOf(filteredOptions[highlighted])}` : undefined;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeDropdown(true) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={!searchable ? activeOptionId : undefined}
        aria-label={ariaLabel ?? name}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 flex items-center justify-between"
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
            id={listboxId}
            style={dropdownStyle}
            className="bg-[#1e2030] border border-white/10 rounded-lg overflow-hidden shadow-xl"
          >
            {/* Buscador opcional */}
            {searchable && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                <Search size={14} className="text-white/40 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleListKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  aria-autocomplete="list"
                  className="bg-transparent text-lg text-white/70 placeholder:text-white/30 outline-none w-full"
                />
              </div>
            )}

            <div role="listbox" aria-label={ariaLabel ?? name} className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-lg text-white/30">
                  Sin resultados
                </p>
              ) : (
                filteredOptions.map((option, i) => {
                  const originalIndex = options.indexOf(option);
                  const label = labels?.[originalIndex] ?? option;
                  const isHighlighted = i === highlighted;
                  return (
                    <button
                      key={option}
                      id={`${name}-option-${originalIndex}`}
                      type="button"
                      role="option"
                      aria-selected={value === label}
                      tabIndex={-1}
                      onMouseEnter={() => setHighlighted(i)}
                      onClick={() => selectOption(option)}
                      className={`w-full px-3 py-2 text-lg text-left transition-colors ${
                        isHighlighted ? "bg-white/10" : "hover:bg-white/5"
                      } ${value === label ? "text-cyan-400" : "text-white/70"}`}
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
