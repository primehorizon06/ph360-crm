import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { CustomerDetailClient } from "./CustomerDetailClient";

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={<Loading fullScreen={false} />}>
      <CustomerDetailClient />
    </Suspense>
  );
}
