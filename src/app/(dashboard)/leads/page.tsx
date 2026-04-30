"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { LeadsListView } from "@/components/leads/LeadsListView/LeadsListView";

export default function LeadsPage() {
  usePageTitle("Leads");
  return <LeadsListView type="lead" />;
}