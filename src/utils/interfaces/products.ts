export type ProductType =
  | "ALERTA_ANUAL"
  | "ALERTA_TRIMESTRAL"
  | "REPARACION_CREDITO"
  | "FORTALECIMIENTO_FINANCIERO";

export type PaymentMethodType = "TARJETA" | "CUENTA";
export type CardType = "DEBITO" | "CREDITO";

export interface PaymentMethod {
  type: PaymentMethodType;
  cardType?: CardType;
  lastFour?: string;
  holderName?: string;
  bank?: string;
  accountNumber?: string;
  accountHolder?: string;
  accountBank?: string;
  routingNumber?: string;
  accountType?: "AHORROS" | "CHEQUES";
}

export interface Product {
  id: number;
  product: ProductType;
  createdAt: string;
  paymentMethod: PaymentMethod & { id: number };
  paymentPlan?: {
    installments: { number: number; date: string; amount: number }[];
  };
  status: "ACTIVE" | "SUSPENDED";
}

export interface Props {
  leadId: string | number;
}

export interface DataPicker {
  number: number;
  date: Date;
  amount: string;
}
