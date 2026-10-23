"use client";

import { Suspense } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LeadsListView } from "@/components/leads/LeadsListView/LeadsListView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function LeadsPage() {
  usePageTitle("Leads");
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadsListView type="lead" />
    </Suspense>
  );
}
