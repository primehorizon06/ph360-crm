"use client";

import { Suspense } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CollectionsQueue } from "@/components/collections/CollectionsQueue";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function CollectionsPage() {
  usePageTitle("Cobros");
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CollectionsQueue />
    </Suspense>
  );
}
