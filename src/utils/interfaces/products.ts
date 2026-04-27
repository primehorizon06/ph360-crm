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

export interface ProductApproval {
  id: number;
  productId: number;
  leadId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isFirstProduct: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
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
  approval: ProductApproval | null;
}

export interface Props {
  leadId: string | number;
  onProductCreated?: () => void;
}

export interface DataPicker {
  number: number;
  date: Date;
  amount: string;
}
