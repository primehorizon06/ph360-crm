import { Suspense } from "react";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { CustomerDetailClient } from "./CustomerDetailClient";

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CustomerDetailClient />
    </Suspense>
  );
}
