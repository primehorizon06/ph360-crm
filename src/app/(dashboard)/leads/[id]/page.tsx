import { Suspense } from "react";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { RecordDetailClient } from "../detail/RecordDetailClient";

export default function LeadDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <RecordDetailClient type="lead" />
    </Suspense>
  );
}
