import { Suspense } from "react";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { LeadDetailClient } from "./LeadDetailClient";

export default function LeadDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LeadDetailClient />
    </Suspense>
  );
}
