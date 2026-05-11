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
  RotateCcw,
  ChevronDown,
  ChevronUp,
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
import { useSession } from "next-auth/react";
import { UserRole } from "@/utils/constants/roles";

// ─── Installment status helpers ───────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400",
  FAILED: "bg-red-500/10 text-red-400",
  CANCELLED: "bg-white/10 text-white/30",
  PENDING: "bg-amber-500/10 text-amber-400",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Pagado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
  PENDING: "Pendiente",
};

// ─── InstallmentRow component ─────────────────────────────────────────────────

interface InstallmentItem {
  id: number;
  number: number;
  date: string;
  amount: number;
  status: string;
  paidAt?: string | null;
}

function InstallmentRow({ inst, idx }: { inst: InstallmentItem; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const isPaid = inst.status === "PAID";

  return (
    <div>
      {/* Fila principal */}
      <button
        type="button"
        onClick={() => isPaid && setExpanded((p) => !p)}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors ${
          idx % 2 === 0 ? "bg-white/5" : ""
        } ${isPaid ? "cursor-pointer hover:bg-white/10" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-md text-white/50 shrink-0">
            {inst.number}
          </span>
          <span className="text-white/30 text-[15px] font-mono shrink-0">
            #{inst.id}
          </span>
          <span className="text-white text-sm">{formatDate(inst.date)}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[15px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[inst.status] ?? STATUS_STYLES.PENDING}`}
          >
            {STATUS_LABELS[inst.status] ?? "Pendiente"}
          </span>
          <span className="text-white text-sm">
            $ {formatAmount(Number(inst.amount))}
          </span>
          {isPaid &&
            (expanded ? (
              <ChevronUp size={12} className="text-white/30" />
            ) : (
              <ChevronDown size={12} className="text-white/30" />
            ))}
        </div>
      </button>

      {/* Detalle expandible — solo si está pagada */}
      {isPaid && expanded && (
        <div className="mx-2 mb-1.5 px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-md">
            <span className="text-white/30">ID cuota</span>
            <span className="text-white/40 font-mono">#{inst.id}</span>
          </div>
          <div className="flex items-center justify-between text-md">
            <span className="text-white/30">Fecha programada</span>
            <span className="text-white/50">{formatDate(inst.date)}</span>
          </div>
          <div className="flex items-center justify-between text-md">
            <span className="text-white/30">Fecha de pago</span>
            <span className="text-emerald-400">
              {inst.paidAt ? formatDate(inst.paidAt) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-md border-t border-emerald-500/10 pt-1.5 mt-1">
            <span className="text-white/30 font-medium">Monto pagado</span>
            <span className="text-emerald-400 font-semibold">
              $ {formatAmount(Number(inst.amount))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductsTab({ leadId, onProductCreated }: Props) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [installmentError, setInstallmentError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingData, setPendingData] = useState<ProductFormData | null>(null);
  const [resubmitting, setResubmitting] = useState<number | null>(null);

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

  async function handleResubmit(productId: number) {
    setResubmitting(productId);
    await fetch(`/api/leads/${leadId}/products/${productId}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESUBMIT" }),
    });
    setResubmitting(null);
    loadProducts();
    onProductCreated?.();
  }

  return (
    <div className="space-y-4">
      
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-lg">
          {products.length} producto{products.length !== 1 ? "s" : ""}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
          >
            <Plus size={16} />
            Asociar producto
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[#13151c] border border-white/10 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-lg font-medium">Nuevo producto</p>
            <button
              type="button"
              onClick={resetForm}
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-lg text-white/40">Producto</label>
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
              <p className="text-red-400 text-lg">{errors.product.message}</p>
            )}
          </div>

          {product && (
            <div className="space-y-1">
              <label className="text-lg text-white/40">Método de pago</label>
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
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-lg font-medium transition-all ${
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

          {paymentType === "TARJETA" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-lg text-white/40">Tipo de tarjeta</label>
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
                          className={`py-2 rounded-lg border text-lg font-medium transition-all ${
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
                  <p className="text-red-400 text-lg">
                    {errors.cardType.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-white/40">
                  Últimos 4 dígitos
                </label>
                <input
                  {...register("lastFour")}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all tracking-widest"
                />
                {"lastFour" in errors && errors.lastFour && (
                  <p className="text-red-400 text-lg">
                    {errors.lastFour.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-white/40">
                  Nombre del titular
                </label>
                <input
                  {...register("holderName")}
                  type="text"
                  placeholder="Como aparece en la tarjeta"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"holderName" in errors && errors.holderName && (
                  <p className="text-red-400 text-lg">
                    {errors.holderName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-white/40">Banco</label>
                <input
                  {...register("bank")}
                  type="text"
                  placeholder="Ej. Chase, Bank of America..."
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"bank" in errors && errors.bank && (
                  <p className="text-red-400 text-lg">{errors.bank.message}</p>
                )}
              </div>
            </div>
          )}

          {paymentType === "CUENTA" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-lg text-white/40">
                  Número de cuenta
                </label>
                <input
                  {...register("accountNumber")}
                  type="text"
                  inputMode="numeric"
                  placeholder="Número de cuenta"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountNumber" in errors && errors.accountNumber && (
                  <p className="text-red-400 text-lg">
                    {errors.accountNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-white/40">
                  Titular de la cuenta
                </label>
                <input
                  {...register("accountHolder")}
                  type="text"
                  placeholder="Nombre del titular"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountHolder" in errors && errors.accountHolder && (
                  <p className="text-red-400 text-lg">
                    {errors.accountHolder.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-white/40">Banco</label>
                <input
                  {...register("accountBank")}
                  type="text"
                  placeholder="Ej. Chase, Bank of America..."
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountBank" in errors && errors.accountBank && (
                  <p className="text-red-400 text-lg">
                    {errors.accountBank.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">Número de ruta</label>
                <input
                  {...register("routingNumber")}
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="000000000"
                  className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all tracking-widest"
                />
                {"routingNumber" in errors && errors.routingNumber && (
                  <p className="text-red-400 text-sm">
                    {errors.routingNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-white/40">Tipo de cuenta</label>
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
                          className={`py-2 rounded-lg border text-lg font-medium transition-all ${
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
                  <p className="text-red-400 text-sm">
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
              className="flex items-center justify-center gap-2 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
            >
              <Plus size={15} />
              Asociar producto
            </button>
          )}
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">
          <Loading />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-[#13151c] border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <ShoppingBag size={32} className="text-white/20" />
          <p className="text-white/50 text-lg">No hay productos asociados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {products.map((lp) => {
            const total =
              lp.paymentPlan?.installments.reduce(
                (acc, i) => acc + Number(i.amount),
                0,
              ) ?? 0;
            const paidCount =
              lp.paymentPlan?.installments.filter((i) => i.status === "PAID")
                .length ?? 0;
            const isRejected = lp.approval?.status === "REJECTED";

            return (
              <div
                key={lp.id}
                className={`bg-[#13151c] border rounded-xl p-4 flex flex-col gap-3 ${
                  isRejected ? "border-red-500/30" : "border-white/10"
                }`}
              >

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
                          <p className="text-white/70 text-sm font-medium">
                            Tarjeta{" "}
                            {lp.paymentMethod.cardType === "DEBITO"
                              ? "Débito"
                              : "Crédito"}{" "}
                            ···· {lp.paymentMethod.lastFour}
                          </p>
                          <p className="text-white/50 text-md truncate">
                            Titular: {lp.paymentMethod.holderName}
                          </p>
                          <p className="text-white/50 text-md truncate">
                            Banco: {lp.paymentMethod.bank}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-white/70 text-sm font-medium truncate">
                            Cuenta: {lp.paymentMethod.accountNumber}
                          </p>
                          <p className="text-white/50 text-md truncate">
                            Titular: {lp.paymentMethod.accountHolder}
                          </p>
                          <p className="text-white/50 text-md truncate">
                            Banco: {lp.paymentMethod.accountBank}
                          </p>
                          <p className="text-white/50 text-md truncate">
                            Ruta: {lp.paymentMethod.routingNumber}
                          </p>
                          <p className="text-white/50 text-md truncate">
                            Tipo:{" "}
                            {lp.paymentMethod.accountType === "AHORROS"
                              ? "Ahorros"
                              : "Cheques"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {lp.paymentPlan && lp.paymentPlan.installments.length > 0 && (
                  <div className="border-t border-white/5 pt-2 space-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/20 text-[15px] uppercase tracking-widest">
                        {lp.paymentPlan.installments.length} cuota
                        {lp.paymentPlan.installments.length !== 1 ? "s" : ""}
                      </p>
                      {paidCount > 0 && (
                        <p className="text-emerald-400 text-[15px]">
                          {paidCount} pagada{paidCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    {lp.paymentPlan.installments.map((inst, idx) => (
                      <InstallmentRow key={inst.id} inst={inst} idx={idx} />
                    ))}
                  </div>
                )}

                {isRejected && (
                  <div className="border-t border-red-500/20 pt-3 mt-1 space-y-2">
                    <div>
                      <p className="text-red-400 text-md font-medium uppercase tracking-wide">
                        Rechazado
                      </p>
                      {lp.approval?.note && (
                        <p className="text-white/40 text-md mt-1 leading-relaxed">
                          {lp.approval.note}
                        </p>
                      )}
                    </div>
                    {(role === UserRole.COACH || role === UserRole.ADMIN) && (
                      <button
                        type="button"
                        onClick={() => handleResubmit(lp.id)}
                        disabled={resubmitting === lp.id}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resubmitting === lp.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RotateCcw size={13} />
                        )}
                        {resubmitting === lp.id
                          ? "Reenviando..."
                          : "Reenviar para aprobación"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
