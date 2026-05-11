import type { CustomerStatus, LeadStatus, ProductType, TypeCustomer } from "@prisma/client";

export interface Lead {
  id: number;
  firstName: string;
  type: TypeCustomer;
  lastName?: string | null;
  phone1: string;
  phone2?: string | null;
  ssn?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  email?: string | null;
  birthDate?: string | null;
  contactTime?: string | null;
  status: LeadStatus;
  companyId: number;
  teamId: number;
  company: { name: string };
  createdAt: string;
  updatedAt: string;
  products?: { id: number; product: ProductType }[];
  customerStatus?: CustomerStatus | null;
  convertedAt?: string | null;
  assignedTo: {
    id: number;
    name: string;
    team?: { name: string };
  };
}

export type TABS_NAME =
  | "personal"
  | "notes"
  | "reminders"
  | "attachments"
  | "documents"
  | "products";
