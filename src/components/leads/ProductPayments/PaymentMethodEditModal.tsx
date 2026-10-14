"use client";

import { useForm, Controller, FieldValues, Path, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import {
  accountDetailsSchema,
  cardDetailsSchema,
  AccountDetailsFormData,
  CardDetailsFormData,
} from "@/lib/validations/product";
import { PaymentMethod } from "@/utils/interfaces/products";

interface Props {
  leadId: string | number;
  productId: number;
  method: PaymentMethod;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all";

function TextField<T extends FieldValues>({
  label,
  name,
  register,
  errors,
  numeric,
  maxLength,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  numeric?: boolean;
  maxLength?: number;
}) {
  const error = errors[name]?.message;
  return (
    <div className="space-y-1">
      <label className="text-lg text-on-surface-variant">{label}</label>
      <input
        {...register(name)}
        type="text"
        inputMode={numeric ? "numeric" : undefined}
        maxLength={maxLength}
        className={inputClass}
      />
      {typeof error === "string" && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

function ChoiceField<T extends FieldValues>({
  label,
  name,
  control,
  errors,
  choices,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  choices: { value: string; label: string }[];
}) {
  const error = errors[name]?.message;
  return (
    <div className="space-y-1">
      <label className="text-lg text-on-surface-variant">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-2">
            {choices.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => field.onChange(c.value)}
                className={`py-2 rounded-lg border text-lg font-medium transition-all ${
                  field.value === c.value
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      />
      {typeof error === "string" && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

async function save(leadId: string | number, productId: number, data: object) {
  const res = await fetch(`/api/leads/${leadId}/products/${productId}/payment-method`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    toast.error(json.error ?? "Error al guardar el método de pago");
    return false;
  }
  toast.success("Método de pago actualizado");
  return true;
}

function AccountForm({ leadId, productId, method, onClose, onSaved }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountDetailsFormData>({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues: {
      accountBank: method.accountBank ?? "",
      accountHolder: method.accountHolder ?? "",
      routingNumber: method.routingNumber ?? "",
      accountNumber: method.accountNumber ?? "",
      accountType: method.accountType,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        if (await save(leadId, productId, data)) onSaved();
      })}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <TextField label="Banco" name="accountBank" register={register} errors={errors} />
        <TextField label="Titular de la cuenta" name="accountHolder" register={register} errors={errors} />
        <TextField label="Número de ruta" name="routingNumber" register={register} errors={errors} numeric maxLength={9} />
        <TextField label="Número de cuenta" name="accountNumber" register={register} errors={errors} numeric />
      </div>
      <ChoiceField
        label="Tipo de cuenta"
        name="accountType"
        control={control}
        errors={errors}
        choices={[
          { value: "AHORROS", label: "Ahorros" },
          { value: "CHEQUES", label: "Cheques" },
        ]}
      />
      <Footer onClose={onClose} saving={isSubmitting} />
    </form>
  );
}

function CardForm({ leadId, productId, method, onClose, onSaved }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CardDetailsFormData>({
    resolver: zodResolver(cardDetailsSchema),
    defaultValues: {
      cardType: method.cardType,
      lastFour: method.lastFour ?? "",
      holderName: method.holderName ?? "",
      bank: method.bank ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        if (await save(leadId, productId, data)) onSaved();
      })}
      className="space-y-3"
    >
      <ChoiceField
        label="Tipo de tarjeta"
        name="cardType"
        control={control}
        errors={errors}
        choices={[
          { value: "DEBITO", label: "Débito" },
          { value: "CREDITO", label: "Crédito" },
        ]}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <TextField label="Últimos 4 dígitos" name="lastFour" register={register} errors={errors} numeric maxLength={4} />
        <TextField label="Nombre del titular" name="holderName" register={register} errors={errors} />
        <TextField label="Banco" name="bank" register={register} errors={errors} />
      </div>
      <Footer onClose={onClose} saving={isSubmitting} />
    </form>
  );
}

function Footer({ onClose, saving }: { onClose: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-lg text-white/90 hover:text-white transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

export function PaymentMethodEditModal(props: Props) {
  const isAccount = props.method.type === "CUENTA";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={props.onClose} />
      <div className="relative bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/80 font-medium">
            {isAccount ? "Editar cuenta bancaria" : "Editar tarjeta"}
          </h3>
          <button
            type="button"
            onClick={props.onClose}
            className="text-white/20 hover:text-white/90 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {isAccount ? <AccountForm {...props} /> : <CardForm {...props} />}
      </div>
    </div>
  );
}
