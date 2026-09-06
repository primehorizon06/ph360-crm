import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface HeaderSearchResult {
  id: number;
  firstName: string;
  lastName: string | null;
  phone1: string;
  city: string | null;
  type: "lead" | "customer";
}

interface HeaderSearchResponse {
  data: HeaderSearchResult[];
}

export function useHeaderSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search: el setState ocurre en el callback del timer, no directo en el efecto
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const swrKey =
    debouncedQuery.length >= 2 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null;

  const { data, isLoading } = useSWR<HeaderSearchResponse>(swrKey, fetcher);

  return { results: data?.data ?? [], loading: isLoading && !!swrKey };
}
