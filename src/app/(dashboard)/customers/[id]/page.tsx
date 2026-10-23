import { Suspense } from "react";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { RecordDetailClient } from "@/app/(dashboard)/leads/detail/RecordDetailClient";

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <RecordDetailClient type="customer" />
    </Suspense>
  );
}
