export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Error en la petición");
  }
  return res.json();
};
