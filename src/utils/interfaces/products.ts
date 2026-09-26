import type {
  AccountType,
  ApprovalStatus,
  CardType,
  InstallmentStatus,
  PaymentMethodType,
  ProductStatus,
} from "@prisma/client";

export type { CardType, PaymentMethodType };

export interface ProductCatalogItem {
  id: number;
  name: string;
  minValue: string;
  maxValue: string | null;
  active: boolean;
  color: string;
  _count?: { products: number };
}

export type ProductCatalogRef = Pick<ProductCatalogItem, "id" | "name" | "color">;

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
  accountType?: AccountType;
}

export interface ProductApproval {
  id: number;
  productId: number;
  leadId: number;
  status: ApprovalStatus;
  isFirstProduct: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  catalogId: number;
  catalog: ProductCatalogRef;
  createdAt: string;
  paymentMethod: PaymentMethod & { id: number };
  paymentPlan?: {
    installments: { id: number; number: number; date: string; amount: number; status: InstallmentStatus }[];
  };
  status: ProductStatus;
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
