"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { CollectionsQueue } from "@/components/collections/CollectionsQueue";

export default function CollectionsPage() {
  usePageTitle("Cobros");
  return <CollectionsQueue />;
}
