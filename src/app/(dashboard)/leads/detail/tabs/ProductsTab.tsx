"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useForm, useWatch, Controller } from "react-hook-form";
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
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ProductFormData, productSchema } from "@/lib/validations/product";
import {
  CardType,
  DataPicker,
  PaymentMethodType,
  ChargeAttemptItem,
  Product,
  ProductCatalogItem,
  Props,
} from "@/utils/interfaces/products";
import {
  formatProductRange,
  productColorClass,
} from "@/utils/constants/products";
import { checkPlanTotal } from "@/lib/validations/productCatalog";
import { CustomSelect } from "@/components/ui/Select";
import { Installment } from "@/utils/interfaces/paymentPlanPicker";
import { PaymentPlanPicker } from "@/components/leads/PaymentPlanPicker/PaymentPlanPicker";
import { formatAmount, formatDate } from "@/utils/helpers/format";
import { fetcher } from "@/lib/fetcher";
import { ConfirmProductModal } from "@/components/leads/Confirmproductmodal/Confirmproductmodal";
import { useSession } from "next-auth/react";
import {
  canConfirmInstallment,
  canCreateProduct,
  canManagePayments,
  canResubmitProduct,
} from "@/lib/permissions";
import { isEditableInstallmentStatus } from "@/lib/validations/installment";
import { canCancel, canReschedule, canSuspend } from "@/lib/collections";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_STYLES,
} from "@/utils/constants/installments";
import {
  ActionTarget,
  CancelModal,
  RescheduleModal,
  SuspendModal,
} from "@/components/collections/CollectionActionModals";
import { postAction } from "@/lib/postAction";
import { confirmToast } from "@/lib/confirmToast";
import { PaymentMethodEditModal } from "@/components/leads/ProductPayments/PaymentMethodEditModal";
import { BankNumbersField } from "../SensitiveField";
import { InstallmentModal } from "@/components/leads/ProductPayments/InstallmentModal";

// ─── Installment status helpers ───────────────────────────────────────────────

const ATTEMPT_LABELS: Record<ChargeAttemptItem["status"], string> = {
  PROCESSING: "En proceso",
  SUCCEEDED: "Pagado",
  FAILED: "Devuelto",
  VOIDED: "Anulado",
  CHARGEBACK: "Contracargo",
};

const ATTEMPT_STYLES: Record<ChargeAttemptItem["status"], string> = {
  PROCESSING: "text-tertiary",
  SUCCEEDED: "text-success",
  FAILED: "text-error",
  VOIDED: "text-on-surface-variant",
  CHARGEBACK: "text-error",
};

// ─── InstallmentRow component ─────────────────────────────────────────────────

interface InstallmentItem {
  id: number;
  number: number;
  date: string;
  amount: number;
  status: string;
  paidAt?: string | null;
  suspendReason?: string | null;
  cancelReason?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: { name: string } | null;
  attempts?: ChargeAttemptItem[];
}

function InstallmentRow({
  inst,
  idx,
  onEdit,
}: {
  inst: InstallmentItem;
  idx: number;
  onEdit?: () => void;
}) {
  const confirmed = inst.status === "PENDING" && !!inst.confirmedAt;
  const [expanded, setExpanded] = useState(false);
  const isPaid = inst.status === "PAID";
  const attempts = inst.attempts ?? [];
  // Último débito creado en SOAR (los intentos vienen del más reciente al más antiguo).
  const soarId = attempts.find((a) => a.processor === "SOAR_ACH" && a.externalId)?.externalId;
  const hasDetail = isPaid || attempts.length > 0 || !!inst.suspendReason || !!inst.cancelReason;

  return (
    <div>
      {/* Fila principal */}
      <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((p) => !p)}
        className={`flex-1 min-w-0 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 py-1.5 rounded-md transition-colors ${
          idx % 2 === 0 ? "bg-white/5" : ""
        } ${hasDetail ? "cursor-pointer hover:bg-white/10" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-md text-white/90 shrink-0">
            {inst.number}
          </span>
          <span className="text-white/90 text-[15px] font-mono shrink-0">
            #{inst.id}
          </span>
          <span className="text-white text-sm whitespace-nowrap">{formatDate(inst.date)}</span>
          {soarId && (
            <span
              title={`ID SOAR: ${soarId}`}
              className="text-on-surface-variant text-[13px] font-mono truncate max-w-28"
            >
              SOAR {soarId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span
            className={`text-[15px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${INSTALLMENT_STATUS_STYLES[inst.status] ?? ""}`}
          >
            {INSTALLMENT_STATUS_LABELS[inst.status] ?? inst.status}
          </span>
          {confirmed && (
            <span
              title={`Pago confirmado el ${formatDate(inst.confirmedAt!)}${inst.confirmedBy ? ` por ${inst.confirmedBy.name}` : ""}`}
              className="text-success"
            >
              <CheckCircle2 size={14} aria-label="Pago confirmado" />
            </span>
          )}
          <span className="text-white text-sm whitespace-nowrap">
            $ {formatAmount(Number(inst.amount))}
          </span>
          {hasDetail &&
            (expanded ? (
              <ChevronUp size={12} className="text-white/90" />
            ) : (
              <ChevronDown size={12} className="text-white/90" />
            ))}
        </div>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar pago ${inst.number}`}
          className="shrink-0 p-1.5 rounded-md text-on-surface-variant hover:text-tertiary hover:bg-white/5 transition-colors"
        >
          <Pencil size={13} />
        </button>
      )}
      </div>

      {/* Detalle expandible — solo si está pagada */}
      {isPaid && expanded && (
        <div className="mx-2 mb-1.5 px-3 py-2.5 bg-success/5 border border-success/15 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-md">
            <span className="text-white/90">ID cuota</span>
            <span className="text-on-surface-variant font-mono">#{inst.id}</span>
          </div>
          <div className="flex items-center justify-between text-md">
            <span className="text-white/90">Fecha programada</span>
            <span className="text-white/90">{formatDate(inst.date)}</span>
          </div>
          <div className="flex items-center justify-between text-md">
            <span className="text-white/90">Fecha de pago</span>
            <span className="text-success">
              {inst.paidAt ? formatDate(inst.paidAt) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-md border-t border-success/10 pt-1.5 mt-1">
            <span className="text-white/90 font-medium">Monto pagado</span>
            <span className="text-success font-semibold">
              $ {formatAmount(Number(inst.amount))}
            </span>
          </div>
        </div>
      )}

      {/* Motivo de suspensión o cancelación e historial de intentos de cobro */}
      {expanded && (inst.suspendReason || inst.cancelReason || attempts.length > 0) && (
        <div className="mx-2 mb-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg space-y-1.5">
          {inst.suspendReason && (
            <p className="text-md text-white/90">
              <span className="text-attention">Suspendida:</span> {inst.suspendReason}
            </p>
          )}
          {inst.cancelReason && (
            <p className="text-md text-on-surface">
              <span className="text-on-surface-variant">Cancelado:</span> {inst.cancelReason}
            </p>
          )}
          {attempts.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 text-md">
              <div className="min-w-0">
                <p className="text-white/90">
                  {a.processor === "SOAR_ACH" ? "Débito ACH" : `Tarjeta ···· ${a.cardLast4 ?? "—"}`}{" "}
                  · {formatDate(a.createdAt)} · {a.chargedBy.name}
                </p>
                {a.externalId && (
                  <p className="text-sm text-on-surface-variant font-mono break-all">
                    ID {a.processor === "SOAR_ACH" ? "SOAR" : "Authorize.net"}: {a.externalId}
                  </p>
                )}
                {a.failureReason && (
                  <p className="text-sm text-error">
                    {a.failureCode ? `${a.failureCode} · ` : ""}
                    {a.failureReason}
                  </p>
                )}
              </div>
              <span className={`shrink-0 font-medium ${ATTEMPT_STYLES[a.status]}`}>
                {ATTEMPT_LABELS[a.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SOAR_SYNC_POLL_MS = 2_000;
const SOAR_SYNC_WINDOW_MS = 60_000;

function awaitingSoarSync(products: Product[]): boolean {
  return products.some((p) => {
    const method = p.paymentMethod;
    const approvedAt = p.approval?.status === "APPROVED" ? p.approval.approvedAt : null;
    return (
      method?.type === "CUENTA" &&
      !method.soarAccountId &&
      !method.soarSyncError &&
      !!approvedAt &&
      Date.now() - new Date(approvedAt).getTime() < SOAR_SYNC_WINDOW_MS
    );
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductsTab({ leadId, onProductCreated }: Props) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const {
    data: products = [],
    isLoading: loading,
    mutate: reloadProducts,
  } = useSWR<Product[]>(`/api/leads/${leadId}/products`, fetcher, {
    refreshInterval: (data) => (data && awaitingSoarSync(data) ? SOAR_SYNC_POLL_MS : 0),
  });
  const { data: catalog = [] } = useSWR<ProductCatalogItem[]>(
    "/api/product-catalog",
    fetcher,
  );
  const activeCatalog = catalog.filter((c) => c.active);
  const [showForm, setShowForm] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingData, setPendingData] = useState<ProductFormData | null>(null);
  const [resubmitting, setResubmitting] = useState<number | null>(null);
  const [editingMethod, setEditingMethod] = useState<Product | null>(null);
  const [methodRevision, setMethodRevision] = useState(0);
  const [installmentModal, setInstallmentModal] = useState<{
    productId: number;
    /** Producto aprobado y activo: se puede confirmar, suspender y reprogramar. */
    collectable: boolean;
    installment?: InstallmentItem;
  } | null>(null);
  const [planAction, setPlanAction] = useState<{
    kind: "suspend" | "reschedule" | "cancel";
    target: ActionTarget;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [syncingProduct, setSyncingProduct] = useState<number | null>(null);
  const confirmsInstallments = canConfirmInstallment(role ?? "");
  const managesPayments = canManagePayments(role ?? "");

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const paymentType = useWatch({ control, name: "paymentType" });
  const catalogId = useWatch({ control, name: "catalogId" });
  const selectedCatalog = activeCatalog.find((c) => String(c.id) === catalogId);

  function resetForm() {
    reset({ paymentType: "TARJETA" });
    setInstallments([]);
    clearErrors("root");
    setShowForm(false);
  }

  const onSubmit = (data: ProductFormData) => {
    if (installments.length === 0) {
      setError("root", { message: "Agrega al menos una cuota al plan de pagos" });
      return;
    }
    const hasEmptyAmounts = installments.some(
      (i) => !i.amount || parseFloat(i.amount) <= 0,
    );
    if (hasEmptyAmounts) {
      setError("root", { message: "Todas las cuotas deben tener un monto mayor a 0" });
      return;
    }
    if (selectedCatalog) {
      const total = installments.reduce((acc, i) => acc + parseFloat(i.amount), 0);
      const rangeError = checkPlanTotal(total, selectedCatalog);
      if (rangeError) {
        setError("root", { message: rangeError });
        return;
      }
    }
    clearErrors("root");
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
      body: JSON.stringify({
        catalogId: Number(pendingData.catalogId),
        paymentMethod,
        installments: installments.map((i) => ({
          number: i.number,
          date: i.date.toISOString(),
          amount: i.amount,
        })),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Error al asociar el producto");
      return;
    }

    setPendingData(null);
    toast.success("Producto asociado exitosamente");
    resetForm();
    reloadProducts();
    onProductCreated?.();
  };

  async function handleResubmit(productId: number) {
    setResubmitting(productId);
    try {
      const res = await fetch(`/api/leads/${leadId}/products/${productId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESUBMIT" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo reenviar el producto");
        return;
      }
      toast.success("Producto reenviado para aprobación");
      reloadProducts();
      onProductCreated?.();
    } catch {
      toast.error("No se pudo reenviar el producto");
    } finally {
      setResubmitting(null);
    }
  }

  async function handleSoarSync(productId: number) {
    setSyncingProduct(productId);
    await postAction(`/api/leads/${leadId}/products/${productId}/soar-sync`, undefined, {
      success: "Cliente sincronizado con SOAR",
      error: "No se pudo sincronizar con SOAR",
    });
    setSyncingProduct(null);
    reloadProducts();
  }

  async function changeProductStatus(product: Product, status: "ACTIVE" | "SUSPENDED") {
    setUpdatingStatus(product.id);
    const res = await fetch(`/api/leads/${leadId}/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setUpdatingStatus(null);

    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      toast.error(json.error ?? "Error al cambiar el estado del producto");
      return;
    }

    const affected: number = json.installmentsAffected ?? 0;
    const plural = affected !== 1 ? "s" : "";
    toast.success(
      status === "SUSPENDED"
        ? `Producto suspendido; ${affected} pago${plural} suspendido${plural}`
        : `Producto reactivado; ${affected} pago${plural} vuelve${affected !== 1 ? "n" : ""} a pendiente (hay que confirmarlo${plural} de nuevo)`,
    );
    if (status === "SUSPENDED" && json.installmentsProcessing > 0)
      toast.warning(
        `${json.installmentsProcessing} débito(s) ya están en SOAR y no se suspendieron. Anúlalos desde Cobros › Proceso si no deben cobrarse.`,
      );
    reloadProducts();
  }

  function handleToggleStatus(product: Product) {
    if (product.status !== "ACTIVE") return void changeProductStatus(product, "ACTIVE");
    confirmToast(
      "¿Suspender el producto? Todos sus pagos pendientes quedarán suspendidos y saldrán de Cobros.",
      () => changeProductStatus(product, "SUSPENDED"),
      "Suspender",
    );
  }

  return (
    <div className="space-y-4">
      
      <div className="flex items-center justify-between">
        <p className="text-on-surface-variant text-lg">
          {products.length} producto{products.length !== 1 ? "s" : ""}
        </p>
        {!showForm && canCreateProduct(role ?? "") && (
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
          className="bg-surface border border-white/10 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-lg font-medium">Nuevo producto</p>
            <button
              type="button"
              onClick={resetForm}
              className="text-white/20 hover:text-white/90 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-lg text-on-surface-variant">Producto</label>
            <Controller
              control={control}
              name="catalogId"
              render={({ field }) => (
                <CustomSelect
                  name="catalogId"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={activeCatalog.map((c) => String(c.id))}
                  labels={activeCatalog.map((c) => c.name)}
                  searchable={false}
                />
              )}
            />
            {errors.catalogId && (
              <p className="text-red-400 text-lg">{errors.catalogId.message}</p>
            )}
            {selectedCatalog && (
              <p className="text-on-surface-variant text-sm">
                Total del plan: {formatProductRange(selectedCatalog)}
              </p>
            )}
          </div>

          {catalogId && (
            <div className="space-y-1">
              <label className="text-lg text-on-surface-variant">Método de pago</label>
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
                              : "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1">
                <label className="text-lg text-on-surface-variant">Tipo de tarjeta</label>
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
                              : "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60"
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
                <label className="text-lg text-on-surface-variant">
                  Últimos 4 dígitos
                </label>
                <input
                  {...register("lastFour")}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all tracking-widest"
                />
                {"lastFour" in errors && errors.lastFour && (
                  <p className="text-red-400 text-lg">
                    {errors.lastFour.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-on-surface-variant">
                  Nombre del titular
                </label>
                <input
                  {...register("holderName")}
                  type="text"
                  placeholder="Como aparece en la tarjeta"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"holderName" in errors && errors.holderName && (
                  <p className="text-red-400 text-lg">
                    {errors.holderName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-on-surface-variant">Banco</label>
                <input
                  {...register("bank")}
                  type="text"
                  placeholder="Ej. Chase, Bank of America..."
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"bank" in errors && errors.bank && (
                  <p className="text-red-400 text-lg">{errors.bank.message}</p>
                )}
              </div>
            </div>
          )}

          {paymentType === "CUENTA" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1">
                <label className="text-lg text-on-surface-variant">Banco</label>
                <input
                  {...register("accountBank")}
                  type="text"
                  placeholder="Ej. Chase, Bank of America..."
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountBank" in errors && errors.accountBank && (
                  <p className="text-red-400 text-lg">
                    {errors.accountBank.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-on-surface-variant">
                  Titular de la cuenta
                </label>
                <input
                  {...register("accountHolder")}
                  type="text"
                  placeholder="Nombre del titular"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountHolder" in errors && errors.accountHolder && (
                  <p className="text-red-400 text-lg">
                    {errors.accountHolder.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-on-surface-variant">Número de ruta</label>
                <input
                  {...register("routingNumber")}
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="000000000"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all tracking-widest"
                />
                {"routingNumber" in errors && errors.routingNumber && (
                  <p className="text-red-400 text-sm">
                    {errors.routingNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-lg text-on-surface-variant">
                  Número de cuenta
                </label>
                <input
                  {...register("accountNumber")}
                  type="text"
                  inputMode="numeric"
                  placeholder="Número de cuenta"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {"accountNumber" in errors && errors.accountNumber && (
                  <p className="text-red-400 text-lg">
                    {errors.accountNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-on-surface-variant">Tipo de cuenta</label>
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
                              : "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60"
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
                clearErrors("root");
              }}
              error={errors.root?.message ?? ""}
            >
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
              >
                <Plus size={15} />
                Asociar producto
              </button>
            </PaymentPlanPicker>
          )}
        </form>
      )}

      {loading ? (
        <ListSkeleton />
      ) : products.length === 0 ? (
        <div className="bg-surface border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <ShoppingBag size={32} className="text-white/20" />
          <p className="text-white/90 text-lg">No hay productos asociados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {products.map((lp) => {
            // Los pagos cancelados no se cobrarán: no suman al total ni al conteo.
            const activeInstallments =
              lp.paymentPlan?.installments.filter((i) => i.status !== "CANCELLED") ?? [];
            const total = activeInstallments.reduce((acc, i) => acc + Number(i.amount), 0);
            const paidCount =
              lp.paymentPlan?.installments.filter((i) => i.status === "PAID")
                .length ?? 0;
            const isRejected = lp.approval?.status === "REJECTED";
            const isApproved = lp.approval?.status === "APPROVED";
            const managesPlan = managesPayments && isApproved;
            const collectable = isApproved && lp.status === "ACTIVE";

            return (
              <div
                key={lp.id}
                className={`bg-surface border rounded-xl p-4 flex flex-col gap-3 ${
                  isRejected ? "border-red-500/30" : "border-white/10"
                }`}
              >

                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${productColorClass(lp.catalog.color)}`}
                  >
                    <ShoppingBag size={11} />
                    {lp.catalog.name}
                  </span>
                  {lp.paymentPlan && lp.paymentPlan.installments.length > 0 && (
                    <span className="text-cyan-400 font-semibold text-lg shrink-0">
                      $ {formatAmount(total)}
                    </span>
                  )}
                </div>

                {isApproved && (lp.status === "SUSPENDED" || managesPlan) && (
                  <div className="flex items-center justify-between gap-2">
                    {lp.status === "SUSPENDED" ? (
                      <span className="text-sm px-2 py-0.5 rounded-full font-medium bg-attention/10 text-attention">
                        Producto suspendido
                      </span>
                    ) : (
                      <span />
                    )}
                    {managesPlan && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(lp)}
                        disabled={updatingStatus === lp.id}
                        className="text-sm text-on-surface-variant hover:text-white transition-colors disabled:opacity-50"
                      >
                        {lp.status === "ACTIVE" ? "Suspender producto" : "Reactivar producto"}
                      </button>
                    )}
                  </div>
                )}

                {lp.paymentMethod && (
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      {lp.paymentMethod.type === "TARJETA" ? (
                        <CreditCard size={16} className="text-on-surface-variant" />
                      ) : (
                        <Building2 size={16} className="text-on-surface-variant" />
                      )}
                    </div>
                    <div className="min-w-0">
                      {lp.paymentMethod.type === "TARJETA" ? (
                        <>
                          <p className="text-white/90 text-lg font-medium">
                            Tarjeta{" "}
                            {lp.paymentMethod.cardType === "DEBITO"
                              ? "Débito"
                              : "Crédito"}{" "}
                            ···· {lp.paymentMethod.lastFour}
                          </p>
                          <p className="text-white/90 text-lg truncate">
                            Titular: {lp.paymentMethod.holderName}
                          </p>
                          <p className="text-white/90 text-lg truncate">
                            Banco: {lp.paymentMethod.bank}
                          </p>
                        </>
                      ) : (
                        <>
                          <BankNumbersField
                            key={methodRevision}
                            maskedAccount={lp.paymentMethod.accountNumber}
                            maskedRouting={lp.paymentMethod.routingNumber}
                            revealUrl={`/api/leads/${leadId}/products/${lp.id}/payment-method/reveal`}
                          />
                          <p className="text-white/90 text-lg truncate">
                            Titular: {lp.paymentMethod.accountHolder}
                          </p>
                          <p className="text-white/90 text-lg truncate">
                            Banco: {lp.paymentMethod.accountBank}
                          </p>
                          <p className="text-white/90 text-lg truncate">
                            Tipo:{" "}
                            {lp.paymentMethod.accountType === "AHORROS"
                              ? "Ahorros"
                              : "Cheques"}
                          </p>
                        </>
                      )}
                    </div>
                    {managesPayments && (
                      <button
                        type="button"
                        onClick={() => setEditingMethod(lp)}
                        aria-label="Editar método de pago"
                        className="ml-auto self-start shrink-0 p-1.5 rounded-md text-on-surface-variant hover:text-cyan-400 hover:bg-white/5 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}

                {isApproved &&
                  lp.paymentMethod?.type === "CUENTA" &&
                  !lp.paymentMethod.soarAccountId &&
                  lp.paymentMethod.soarSyncError && (
                    <div className="rounded-lg border border-attention/30 bg-attention/10 px-3 py-2 space-y-1.5">
                      <p className="text-sm text-attention font-medium">
                        Pendiente de sincronizar con SOAR
                      </p>
                      <p className="text-sm text-white/90">{lp.paymentMethod.soarSyncError}</p>
                      {managesPayments && (
                        <button
                          type="button"
                          onClick={() => handleSoarSync(lp.id)}
                          disabled={syncingProduct === lp.id}
                          className="flex items-center gap-1.5 text-sm text-attention hover:text-white transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={12} className={syncingProduct === lp.id ? "animate-spin" : ""} />
                          Reintentar
                        </button>
                      )}
                    </div>
                  )}

                {lp.paymentPlan && lp.paymentPlan.installments.length > 0 && (
                  <div className="border-t border-white/5 pt-2 space-y-0.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/20 text-[15px] uppercase tracking-widest">
                        {activeInstallments.length} cuota
                        {activeInstallments.length !== 1 ? "s" : ""}
                      </p>
                      {paidCount > 0 && (
                        <p className="text-success text-[15px]">
                          {paidCount} pagada{paidCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    {lp.paymentPlan.installments.map((inst, idx) => (
                      <InstallmentRow
                        key={inst.id}
                        inst={inst}
                        idx={idx}
                        onEdit={
                          (managesPlan &&
                            (isEditableInstallmentStatus(inst.status) || canCancel(inst.status))) ||
                          (confirmsInstallments && collectable && inst.status === "PENDING")
                            ? () =>
                                setInstallmentModal({ productId: lp.id, collectable, installment: inst })
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                {managesPlan && (
                  <button
                    type="button"
                    onClick={() => setInstallmentModal({ productId: lp.id, collectable })}
                    className="flex items-center justify-center gap-2 w-full py-1.5 rounded-lg border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/5 text-sm transition-colors"
                  >
                    <Plus size={13} />
                    Agregar pago
                  </button>
                )}

                {isRejected && (
                  <div className="border-t border-red-500/20 pt-3 mt-1 space-y-2">
                    <div>
                      <p className="text-red-400 text-md font-medium uppercase tracking-wide">
                        Rechazado
                      </p>
                      {lp.approval?.note && (
                        <p className="text-on-surface-variant text-md mt-1 leading-relaxed">
                          {lp.approval.note}
                        </p>
                      )}
                    </div>
                    {canResubmitProduct(role ?? "") && (
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

      {pendingData && selectedCatalog && (
        <ConfirmProductModal
          data={pendingData}
          catalog={selectedCatalog}
          installments={installments}
          saving={saving}
          onConfirm={confirmSave}
          onCancel={() => setPendingData(null)}
        />
      )}

      {editingMethod?.paymentMethod && (
        <PaymentMethodEditModal
          leadId={leadId}
          productId={editingMethod.id}
          method={editingMethod.paymentMethod}
          onClose={() => setEditingMethod(null)}
          onSaved={() => {
            setEditingMethod(null);
            setMethodRevision((r) => r + 1);
            reloadProducts();
          }}
        />
      )}

      {installmentModal && (() => {
        const { installment: inst, collectable, productId } = installmentModal;
        const managesPlan = managesPayments && collectable;
        // Abre la acción del plan de pagos (suspender, reprogramar o cancelar) en su modal.
        const openAction = (kind: "suspend" | "reschedule" | "cancel") => () => {
          if (!inst) return;
          setInstallmentModal(null);
          setPlanAction({
            kind,
            target: {
              id: inst.id,
              number: inst.number,
              date: inst.date,
              amount: Number(inst.amount),
              processing: inst.status === "PROCESSING",
            },
          });
        };
        return (
          <InstallmentModal
            leadId={leadId}
            productId={productId}
            installment={inst}
            canEditPlan={managesPayments}
            canConfirm={!!inst && confirmsInstallments && collectable && inst.status === "PENDING"}
            onSuspend={inst && managesPlan && canSuspend(inst.status) ? openAction("suspend") : undefined}
            onReschedule={
              inst && managesPlan && canReschedule(inst.status) ? openAction("reschedule") : undefined
            }
            onCancel={inst && managesPlan && canCancel(inst.status) ? openAction("cancel") : undefined}
            onClose={() => setInstallmentModal(null)}
            onSaved={() => {
              setInstallmentModal(null);
              reloadProducts();
            }}
          />
        );
      })()}

      {planAction?.kind === "suspend" && (
        <SuspendModal
          target={planAction.target}
          onClose={() => setPlanAction(null)}
          onDone={() => {
            setPlanAction(null);
            reloadProducts();
          }}
        />
      )}
      {planAction?.kind === "cancel" && (
        <CancelModal
          target={planAction.target}
          onClose={() => setPlanAction(null)}
          onDone={() => {
            setPlanAction(null);
            reloadProducts();
          }}
        />
      )}
      {planAction?.kind === "reschedule" && (
        <RescheduleModal
          target={planAction.target}
          onClose={() => setPlanAction(null)}
          onDone={() => {
            setPlanAction(null);
            reloadProducts();
          }}
        />
      )}
    </div>
  );
}
