"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  ProductCatalogFormData,
  productCatalogSchema,
} from "@/lib/validations/productCatalog";
import {
  PRODUCT_COLOR_KEYS,
  productColorClass,
} from "@/utils/constants/products";
import { ProductCatalogItem } from "@/utils/interfaces/products";
import { Switch } from "@/components/ui/Switch";

interface Props {
  product: ProductCatalogItem | null;
  onClose: () => void;
  onSave: () => void;
}

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50";

export function ProductCatalogModal({ product, onClose, onSave }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductCatalogFormData>({
    resolver: zodResolver(productCatalogSchema),
    defaultValues: {
      name: product?.name ?? "",
      minValue: product ? Number(product.minValue) : undefined,
      maxValue:
        product?.maxValue != null ? Number(product.maxValue) : null,
      active: product?.active ?? true,
      color: product?.color ?? "cyan",
    },
  });
  const name = useWatch({ control, name: "name" });

  async function onSubmit(data: ProductCatalogFormData) {
    const res = await fetch(
      product ? `/api/product-catalog/${product.id}` : "/api/product-catalog",
      {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Error al guardar");
      return;
    }
    toast.success(product ? "Producto actualizado" : "Producto creado");
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-on-surface-variant mb-1 block">Nombre</label>
            <input {...register("name")} className={inputClass} />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-on-surface-variant mb-1 block">
                Valor mínimo ($)
              </label>
              <input
                {...register("minValue", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
              />
              {errors.minValue && (
                <p className="text-red-400 text-sm mt-1">{errors.minValue.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-on-surface-variant mb-1 block">
                Valor máximo ($) <span className="text-white/40">— opcional</span>
              </label>
              <input
                {...register("maxValue", {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
                type="number"
                step="0.01"
                min="0"
                placeholder="Sin tope"
                className={inputClass}
              />
              {errors.maxValue && (
                <p className="text-red-400 text-sm mt-1">{errors.maxValue.message}</p>
              )}
            </div>
          </div>
          <p className="text-on-surface-variant text-sm -mt-2">
            El total del plan de pagos debe ser al menos el mínimo. Si dejas el
            máximo vacío, no se limita.
          </p>

          <div>
            <label className="text-sm text-on-surface-variant mb-1 block">Color</label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_COLOR_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => field.onChange(key)}
                      className={`text-sm px-2.5 py-1 rounded-full border font-medium transition-all ${productColorClass(key)} ${
                        field.value === key ? "ring-2 ring-white/40" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {name || "Producto"}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-lg text-white/80">Producto activo</p>
              <p className="text-sm text-on-surface-variant">
                Solo los productos activos se pueden asociar a un lead.
              </p>
            </div>
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  aria-label="Producto activo"
                />
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-lg text-white/90 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
