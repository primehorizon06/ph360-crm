"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parsePageSize } from "@/components/ui/Pagination";

const SEARCH_DEBOUNCE_MS = 300;

export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = parsePageSize(searchParams.get("size"));

  const [search, setSearch] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [sentQuery, setSentQuery] = useState(query);

  if (query !== syncedQuery) {
    setSyncedQuery(query);
    if (query !== sentQuery) setSearch(query);
  }

  const updateParams = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value && value !== "ALL") params.set(key, value);
        else params.delete(key);
      }
      if (!("page" in patch) || patch.page === "1") params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => {
      setSentQuery(search);
      updateParams({ q: search });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, query, updateParams]);

  return { searchParams, updateParams, query, search, setSearch, page, pageSize };
}

export function useRowNavigation() {
  const router = useRouter();
  return useCallback(
    (e: React.MouseEvent, href: string) => {
      if (e.button > 1) return;
      if ((e.target as HTMLElement).closest("a, button")) return;
      if (e.metaKey || e.ctrlKey || e.button === 1) {
        window.open(href, "_blank", "noopener");
        return;
      }
      router.push(href);
    },
    [router],
  );
}
