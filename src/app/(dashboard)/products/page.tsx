"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { Plus, Pencil, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loading } from "@/components/ui/Loading";
import { CustomSelect } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetcher } from "@/lib/fetcher";
import {
  formatProductRange,
  productColorClass,
} from "@/utils/constants/products";
import { ProductCatalogItem } from "@/utils/interfaces/products";

const ProductCatalogModal = dynamic(
  () =>
    import("@/components/products/ProductCatalogModal").then(
      (m) => m.ProductCatalogModal,
    ),
  { ssr: false },
);

export default function ProductsPage() {
  usePageTitle("Productos");
  const [modal, setModal] = useState<{
    open: boolean;
    product: ProductCatalogItem | null;
  }>({ open: false, product: null });
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [toggling, setToggling] = useState<number | null>(null);

  const { data: products = [], isLoading, mutate } = useSWR<
    ProductCatalogItem[]
  >("/api/product-catalog", fetcher);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchActive =
          filterActive === "all"
            ? true
            : filterActive === "active"
              ? p.active
              : !p.active;
        return matchSearch && matchActive;
      }),
    [products, search, filterActive],
  );

  async function toggleActive(product: ProductCatalogItem, active: boolean) {
    setToggling(product.id);
    try {
      await mutate(
        async () => {
          const res = await fetch(`/api/product-catalog/${product.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error ?? "Error al actualizar el producto");
          }
          return undefined;
        },
        {
          optimisticData: products.map((p) =>
            p.id === product.id ? { ...p, active } : p,
          ),
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        },
      );
      toast.success(active ? "Producto activado" : "Producto desactivado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggling(null);
    }
  }

  const activeCount = products.filter((p) => p.active).length;

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-lg text-white/70 placeholder:text-white/90 outline-none w-full"
          />
        </div>
        <CustomSelect
          name="filter"
          value={
            filterActive === "all"
              ? "Todos"
              : filterActive === "active"
                ? "Activos"
                : "Inactivos"
          }
          onChange={(val) =>
            setFilterActive(val as "all" | "active" | "inactive")
          }
          options={["all", "active", "inactive"]}
          labels={["Todos", "Activos", "Inactivos"]}
        />
      </div>

      <PageHeader
        title="Productos"
        description={`${activeCount} activos · ${products.length - activeCount} inactivos.`}
        action={{
          label: "Nuevo Producto",
          icon: Plus,
          onClick: () => setModal({ open: true, product: null }),
        }}
      />

      <div className="space-y-2">
        {filtered.map((product) => (
          <div
            key={product.id}
            className={`bg-surface border rounded-xl flex items-center justify-between px-4 py-3 gap-3 transition-colors ${
              product.active ? "border-white/10" : "border-white/5 bg-surface/60"
            }`}
          >
            <div className={`min-w-0 transition-opacity ${product.active ? "" : "opacity-50"}`}>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${productColorClass(product.color)}`}
              >
                <ShoppingBag size={11} />
                {product.name}
              </span>
              <p className="text-on-surface-variant text-sm mt-1">
                {formatProductRange(product)} ·{" "}
                {product._count?.products ?? 0} vendidos
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Switch
                checked={product.active}
                onChange={(active) => toggleActive(product, active)}
                disabled={toggling === product.id}
                label={product.active ? "Activo" : "Inactivo"}
                aria-label={`${product.active ? "Desactivar" : "Activar"} ${product.name}`}
              />
              <button
                onClick={() => setModal({ open: true, product })}
                title="Editar"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="text-center py-12 text-white/90 text-lg">
            No hay productos registrados
          </div>
        )}
      </div>

      {modal.open && (
        <ProductCatalogModal
          key={modal.product?.id ?? "new"}
          product={modal.product}
          onClose={() => setModal({ open: false, product: null })}
          onSave={() => {
            setModal({ open: false, product: null });
            void mutate();
          }}
        />
      )}
    </div>
  );
}
