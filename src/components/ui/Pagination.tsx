"use client";

import { useEffect } from "react";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

export function parsePageSize(value: string | null | undefined): number {
  const size = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  itemLabel: { singular: string; plural: string };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_BUTTON =
  "px-3 py-1 text-sm rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors";

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const outOfRange = totalPages > 0 && page > totalPages;

  useEffect(() => {
    if (outOfRange) onPageChange(totalPages);
  }, [outOfRange, totalPages, onPageChange]);

  if (total <= 0 || outOfRange) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
        <span className="tabular-nums">
          {from}–{to} de {total} {total === 1 ? itemLabel.singular : itemLabel.plural}
        </span>
        <label className="flex items-center gap-2">
          Mostrar
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-surface-container border border-outline-variant rounded px-2 py-1 text-sm text-on-surface outline-none focus-visible:border-tertiary/50"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-on-surface-variant tabular-nums">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={PAGE_BUTTON}
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={PAGE_BUTTON}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
