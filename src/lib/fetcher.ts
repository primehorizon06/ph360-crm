export const fetcher = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Error en la petición");
  }
  return res.json();
};

export const postFetcher = (url: string) => fetcher(url, { method: "POST" });
