"use client";

import { Props } from "@/utils/interfaces/productChecklist";
import { ProductChecklistItem } from "./components/ProductChecklistItem";

export function ProductChecklist({
  leadId,
  products,
  onApprovalChange,
}: Props) {
  const pendingProducts = products.filter(
    (p) => p.approval?.status === "PENDING",
  );

  if (pendingProducts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-amber-400 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {pendingProducts.length} producto
        {pendingProducts.length !== 1 ? "s" : ""} pendiente
        {pendingProducts.length !== 1 ? "s" : ""} de aprobación
      </p>
      {pendingProducts.map((product) => (
        <ProductChecklistItem
          key={product.id}
          leadId={leadId}
          product={product}
          onApprovalChange={onApprovalChange}
        />
      ))}
    </div>
  );
}
