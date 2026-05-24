import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { LeadDetailClient } from "./LeadDetailClient";

export default function LeadDetailPage() {
  return (
    <Suspense fallback={<Loading fullScreen={false} />}>
      <LeadDetailClient />
    </Suspense>
  );
}
