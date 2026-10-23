"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { Lead, TABS_NAME } from "@/utils/interfaces/leads";
import { Product } from "@/utils/interfaces/products";
import { VALID_TABS } from "@/utils/constants/leads";
import { fetcher } from "@/lib/fetcher";
import { canViewProductChecklist } from "@/lib/permissions";
import { ProductChecklist } from "@/components/leads/ProductChecklist/ProductChecklist";
import { LeadDetailHeader } from "./LeadDetailHeader";
import { LeadDetailTabs } from "./LeadDetailTabs";
import { PersonalTab } from "./tabs/PersonalTab";
import { NotesTab } from "./tabs/NotesTab";
import { RemindersTab } from "./tabs/RemindersTab";
import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { ProductsTab } from "./tabs/ProductsTab";

const LeadEditModal = dynamic(
  () => import("@/components/leads/LeadEditModal").then((m) => m.LeadEditModal),
  { ssr: false },
);

const RECORD_TYPES = {
  lead: {
    label: "Lead",
    basePath: "/leads",
    suspendPrompt: "¿Suspender este lead?",
    suspendError: "Error al suspender el lead",
    suspendSuccess: "Lead suspendido",
  },
  customer: {
    label: "Cliente",
    basePath: "/customers",
    suspendPrompt: "¿Estas seguro de que quieres suspender este Cliente?",
    suspendError: "Error al suspender el cliente",
    suspendSuccess: "Cliente suspendido",
  },
} as const;

interface Props {
  type: keyof typeof RECORD_TYPES;
}

export function RecordDetailClient({ type }: Props) {
  const config = RECORD_TYPES[type];
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const { data: lead, isLoading, mutate: mutateLead, error: leadError } =
    useSWR<Lead>(id ? `/api/leads/${id}` : null, fetcher);
  const { data: products = [], mutate: mutateProducts } = useSWR<Product[]>(
    id ? `/api/leads/${id}/products` : null,
    fetcher,
  );

  usePageTitle(
    lead?.firstName
      ? `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")} - ${config.label}`
      : config.label,
  );

  const tabFromUrl = searchParams.get("tab") as TABS_NAME;
  const isValidTab = tabFromUrl && VALID_TABS.includes(tabFromUrl);
  const [activeTab, setActiveTab] = useState<TABS_NAME>(
    isValidTab ? tabFromUrl : "personal",
  );

  useEffect(() => {
    if (leadError) router.push(config.basePath);
    if (type === "customer" && lead && lead.type !== "customer") {
      router.push(config.basePath);
    }
  }, [lead, leadError, router, type, config.basePath]);

  async function handleApprovalChange() {
    await Promise.all([mutateLead(), mutateProducts()]);
  }

  function handleSuspend() {
    toast(config.suspendPrompt, {
      action: {
        label: "Suspender",
        onClick: async () => {
          const res = await fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "suspended" }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast.error(data.error ?? config.suspendError);
            return;
          }
          toast.success(config.suspendSuccess);
          void mutateLead();
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  const handleTabChange = (tab: TABS_NAME) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    startTransition(() => {
      router.push(`${config.basePath}/${id}?${params.toString()}`, { scroll: false });
    });
  };

  useEffect(() => {
    const handlePopState = () => {
      const newTab = searchParams.get("tab") as TABS_NAME;
      if (newTab && VALID_TABS.includes(newTab)) {
        setActiveTab(newTab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [searchParams]);

  if (isLoading) return <DetailSkeleton />;
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <LeadDetailHeader
        lead={lead}
        role={role}
        onSuspend={handleSuspend}
        onEdit={() => setEditing(true)}
      />

      {canViewProductChecklist(role ?? "") && (
        <ProductChecklist
          leadId={lead.id}
          products={products}
          onApprovalChange={handleApprovalChange}
        />
      )}

      <LeadDetailTabs activeTab={activeTab} onChange={handleTabChange} />

      <div className="max-h-[60vh] overflow-y-auto pr-2 pb-2">
        {activeTab === "personal" && <PersonalTab lead={lead} />}
        {activeTab === "notes" && <NotesTab leadId={lead.id} />}
        {activeTab === "reminders" && <RemindersTab leadId={lead.id} />}
        {activeTab === "attachments" && <AttachmentsTab leadId={lead.id} />}
        {activeTab === "products" && (
          <ProductsTab
            leadId={lead.id}
            onProductCreated={() => void mutateProducts()}
          />
        )}
      </div>

      {editing && (
        <LeadEditModal
          type={type}
          key={lead.id}
          lead={lead}
          onClose={() => setEditing(false)}
          onSave={() => {
            setEditing(false);
            void mutateLead();
          }}
        />
      )}
    </div>
  );
}
