"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { LeadsListView } from "@/components/leads/LeadsListView/LeadsListView";

export default function CustomersPage() {
  usePageTitle("Clientes");
  return <LeadsListView type="customer" />;
}
