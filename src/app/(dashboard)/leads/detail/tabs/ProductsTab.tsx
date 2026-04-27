"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShoppingBag,
  Plus,
  CreditCard,
  Building2,
  X,
  Loader2,
} from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { ProductFormData, productSchema } from "@/lib/validations/product";
import {
  CardType,
  DataPicker,
  PaymentMethodType,
  Product,
  Props,
} from "@/utils/interfaces/products";
import {
  PRODUCT_COLORS,
  PRODUCT_LABELS,
  PRODUCTS,
} from "@/utils/constants/products";
import { CustomSelect } from "@/components/ui/Select";
import { Installment } from "@/utils/interfaces/paymentPlanPicker";
import { PaymentPlanPicker } from "@/components/leads/PaymentPlanPicker/PaymentPlanPicker";
import { formatAmount, formatDate } from "@/utils/helpers/format";
import { ConfirmProductModal } from "@/components/leads/Confirmproductmodal/Confirmproductmodal";

export function ProductsTab({ leadId, onProductCreated }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [installmentError, setInstallmentError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingData, setPendingData] = useState<ProductFormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const paymentType = watch("paymentType");
  const product = watch("product");

  async function loadProducts() {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/products`);
    setProducts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, [leadId]);

  function resetForm() {
    reset({ paymentType: "TARJETA" });
    setInstallments([]);
    setInstallmentError("");
    setShowForm(false);
  }

  // Valida y abre el modal de confirmación
  const onSubmit = (data: ProductFormData) => {
    if (installments.length === 0) {
      setInstallmentError("Agrega al menos una cuota al plan de pagos");
      return;
    }
    const hasEmptyAmounts = installments.some(
      (i) => !i.amount || parseFloat(i.amount) <= 0,
    );
    if (hasEmptyAmounts) {
      setInstallmentError("Todas las cuotas deben tener un monto mayor a 0");
      return;
    }
    setInstallmentError("");
    setPendingData(data);
  };

  // Ejecuta el guardado real tras confirmar
  const confirmSave = async () => {
    if (!pendingData) return;
    setSaving(true);

    const paymentMethod =
      pendingData.paymentType === "TARJETA"
        ? {
            type: "TARJETA",
            cardType: pendingData.cardType,
            lastFour: pendingData.lastFour,
            holderName: pendingData.holderName,
            bank: pendingData.bank,
          }
        : {
            type: "CUENTA",
            accountNumber: pendingData.accountNumber,
            accountHolder: pendingData.accountHolder,
            accountBank: pendingData.accountBank,
            routingNumber: pendingData.routingNumber,
            accountType: pendingData.accountType,
          };

    const res = await fetch(`/api/leads/${leadId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: pendingData.product, paymentMethod }),
    });

    if (!res.ok) {
      setSaving(false);
      return;
    }

    const newProduct = await res.json();

    await fetch(`/api/leads/${leadId}/products/${newProduct.id}/payment-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installments: installments.map((i) => ({
          number: i.number,
          date: i.date.toISOString(),
          amount: i.amount,
        })),
      }),
    });

    setSaving(false);
    setPendingData(null);
    resetForm();
    loadProducts();
    onProductCreated?.(); 
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">
          {products.length} producto{products.length !== 1 ? "s" : ""}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Asociar producto
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[#13151c] border border-white/10 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm font-medium">Nuevo producto</p>
            <button
              type="button"
              onClick={resetForm}
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Producto */}
          <div className="space-y-1">
            <label className="text-sm text-white/40">Producto</label>
            <Controller
              control={control}
              name="product"
              render={({ field }) => (
                <CustomSelect
                  name="product"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={PRODUCTS}
                  labels={PRODUCTS.map((p) => PRODUCT_LABELS[p])}
                  searchable={false}
                />
              )}
            />
            {errors.product && (
              <p className="text-red-400 text-sm">{errors.product.message}</p>
            )}
          </div>

          {/* Método de pago */}
          {product && (
            <div className="space-y-1">
              <label className="text-sm text-white/40">Método de pago</label>
              <Controller
                control={control}
                name="paymentType"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {(["TARJETA", "CUENTA"] as PaymentMethodType[]).map(
                      (type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            field.value === type
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                              : "border-white/10 bg-white/5 text-white/40 hover:text-white/60"
                          }`}
                        >
                          {type === "TARJETA" ? (
                            <CreditCard size={15} />
                          ) : (
                            <Building2 size={15} />
                          )}
                          {type === "TARJETA" ? "Tarjeta" : "Cuenta"}
                        </button>
                      ),
                    )}
                  </div>
                )}
              />
            </div>
          )}

          {/* Campos Tarjeta */}
          {paymentType === "TARJETA" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-white/40">Tipo de tarjeta</label>
                <Controller
                  control={control}
                  name="cardType"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2">
                      {(["DEBITO", "CREDITO"] as CardType[]).map((ct) => (
                        <button
                          key={ct}
                          type="button"
                          onClick={() => field.onChange(ct)}
                          className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                            field.value === ct
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                              : "border-white/10 bg-white/5 text-white/40 hover:text-white/60"
                          }`}
                        >
                          {ct === "DEBITO" ? "Débito" : "Crédito"}
                        </button>
                      ))}
                    </div>
                  )}
                />
                {"cardType" in errors && errors.cardType && (
                  <p className="text-red-400 text-sm">
                    {errors.cardType.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">
                  Últimos 4 dígitos
                </label>
                <input
                  {...register("lastFour")}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all tracking-widest"
                />
                {"lastFour" in errors && errors.lastFour && (
                  <p className="text-red-400 text-sm">
                    {errors.lastFour.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">
                  Nombre del titular
                </label>
                <input
                  {...register("holderName")}
                  type="text"
                  placeholder="Como aparece en la tarjeta"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"holderName" in errors && errors.holderName && (
                  <p className="text-red-400 text-sm">
                    {errors.holderName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">Banco</label>
                <input
                  {...register("bank")}
                  type="text"
                  placeholder="Ej. Chase, Bank of America..."
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"bank" in errors && errors.bank && (
                  <p className="text-red-400 text-sm">{errors.bank.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Campos Cuenta */}
          {paymentType === "CUENTA" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-white/40">
                  Número de cuenta
                </label>
                <input
                  {...register("accountNumber")}
                  type="text"
                  inputMode="numeric"
                  placeholder="Número de cuenta"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountNumber" in errors && errors.accountNumber && (
                  <p className="text-red-400 text-sm">
                    {errors.accountNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">
                  Titular de la cuenta
                </label>
                <input
                  {...register("accountHolder")}
                  type="text"
                  placeholder="Nombre del titular"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountHolder" in errors && errors.accountHolder && (
                  <p className="text-red-400 text-sm">
                    {errors.accountHolder.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">Banco</label>
                <input
                  {...register("accountBank")}
                  type="text"
                  placeholder="Ej. Chase, Bank of America..."
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountBank" in errors && errors.accountBank && (
                  <p className="text-red-400 text-sm">
                    {errors.accountBank.message}
                  </p>
                )}
              </div>

              {/* Número de ruta */}
              <div className="space-y-1">
                <label className="text-xs text-white/40">Número de ruta</label>
                <input
                  {...register("routingNumber")}
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="000000000"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all tracking-widest"
                />
                {"routingNumber" in errors && errors.routingNumber && (
                  <p className="text-red-400 text-xs">
                    {errors.routingNumber.message}
                  </p>
                )}
              </div>

              {/* Tipo de cuenta */}
              <div className="space-y-1">
                <label className="text-xs text-white/40">Tipo de cuenta</label>
                <Controller
                  control={control}
                  name="accountType"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2">
                      {(["AHORROS", "CHEQUES"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                            field.value === type
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                              : "border-white/10 bg-white/5 text-white/40 hover:text-white/60"
                          }`}
                        >
                          {type === "AHORROS" ? "Ahorros" : "Cheques"}
                        </button>
                      ))}
                    </div>
                  )}
                />
                {"accountType" in errors && errors.accountType && (
                  <p className="text-red-400 text-xs">
                    {errors.accountType.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Plan de pagos */}
          {paymentType && (
            <PaymentPlanPicker
              value={installments}
              onChange={(val: DataPicker[]) => {
                setInstallments(val);
                setInstallmentError("");
              }}
              error={installmentError}
            />
          )}

          {/* Submit */}
          {paymentType && (
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus size={15} />
              Asociar producto
            </button>
          )}
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8">
          <Loading />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-[#13151c] border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <ShoppingBag size={32} className="text-white/20" />
          <p className="text-white/50 text-sm">No hay productos asociados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {products.map((lp) => {
            const total =
              lp.paymentPlan?.installments.reduce(
                (acc, i) => acc + Number(i.amount),
                0,
              ) ?? 0;

            return (
              <div
                key={lp.id}
                className="bg-[#13151c] border border-white/10 rounded-xl p-4 flex flex-col gap-3"
              >
                {/* Badge + total */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${PRODUCT_COLORS[lp.product]}`}
                  >
                    <ShoppingBag size={11} />
                    {PRODUCT_LABELS[lp.product]}
                  </span>
                  {lp.paymentPlan && lp.paymentPlan.installments.length > 0 && (
                    <span className="text-cyan-400 font-semibold text-lg shrink-0">
                      $ {formatAmount(total)}
                    </span>
                  )}
                </div>

                {/* Método de pago */}
                {lp.paymentMethod && (
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      {lp.paymentMethod.type === "TARJETA" ? (
                        <CreditCard size={16} className="text-white/40" />
                      ) : (
                        <Building2 size={16} className="text-white/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      {lp.paymentMethod.type === "TARJETA" ? (
                        <>
                          <p className="text-white/70 text-lg font-medium">
                            Tarjeta{" "}
                            {lp.paymentMethod.cardType === "DEBITO"
                              ? "Débito"
                              : "Crédito"}{" "}
                            ···· {lp.paymentMethod.lastFour}
                          </p>
                          <p className="text-white/70 text-lg truncate">
                            Titular: {lp.paymentMethod.holderName}
                          </p>
                          <p className="text-white/70 text-lg truncate">
                            Banco: {lp.paymentMethod.bank}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-white/70 text-lg font-medium truncate">
                            Cuenta: {lp.paymentMethod.accountNumber}
                          </p>
                          <p className="text-white/70 text-lg truncate">
                            Titular: {lp.paymentMethod.accountHolder}
                          </p>
                          <p className="text-white/70 text-lg truncate">
                            Banco: {lp.paymentMethod.accountBank}
                          </p>
                          <p className="text-white/70 text-lg truncate">
                            Número de ruta: {lp.paymentMethod.routingNumber}
                          </p>
                          <p className="text-white/70 text-lg truncate">
                            Tipo de cuenta:{" "}
                            {lp.paymentMethod.accountType === "AHORROS"
                              ? "Ahorros"
                              : "Cheques"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Cuotas */}
                {lp.paymentPlan && lp.paymentPlan.installments.length > 0 && (
                  <div className="border-t border-white/5 pt-2 space-y-1">
                    <p className="text-white/20 text-[10px] uppercase tracking-widest mb-1.5">
                      {lp.paymentPlan.installments.length} cuota
                      {lp.paymentPlan.installments.length !== 1 ? "s" : ""}
                    </p>
                    {lp.paymentPlan.installments.map((inst, idx) => (
                      <div
                        key={inst.number}
                        className={`flex items-center justify-between px-2 py-1 rounded-md ${
                          idx % 2 === 0 ? "bg-white/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-white text-lg">
                          <span className="w-4.5 h-4.5 rounded-full bg-white/5 flex items-center justify-center text-sm">
                            {inst.number}
                          </span>
                          {formatDate(inst.date)}
                        </div>
                        <span className="text-white text-lg">
                          $ {formatAmount(Number(inst.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación */}
      {pendingData && (
        <ConfirmProductModal
          data={pendingData}
          installments={installments}
          saving={saving}
          onConfirm={confirmSave}
          onCancel={() => setPendingData(null)}
        />
      )}
    </div>
  );
}
