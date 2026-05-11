"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loading } from "@/components/ui/Loading";
import { LeadEditModal } from "@/components/leads/LeadEditModal";
import { Lead, TABS_NAME } from "@/utils/interfaces/leads";
import { LeadDetailHeader } from "../detail/LeadDetailHeader";
import { LeadDetailTabs } from "../detail/LeadDetailTabs";
import { PersonalTab } from "../detail/tabs/PersonalTab";
import { NotesTab } from "../detail/tabs/NotesTab";
import { RemindersTab } from "../detail/tabs/RemindersTab";
import { AttachmentsTab } from "../detail/tabs/AttachmentsTab";
import { ProductsTab } from "../detail/tabs/ProductsTab";
import { ProductChecklist } from "@/components/leads/ProductChecklist/ProductChecklist";
import { VALID_TABS } from "@/utils/constants/leads";
import { Product } from "@/utils/interfaces/products";
import { toast } from "sonner";
import { UserRole } from "@/utils/constants/roles";

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [lead, setLead] = useState<Lead | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  usePageTitle(lead?.firstName ? `${lead.firstName} ${lead.lastName} - Lead` : "Lead");

  const tabFromUrl = searchParams.get("tab") as TABS_NAME;
  const isValidTab = tabFromUrl && VALID_TABS.includes(tabFromUrl);

  const [activeTab, setActiveTab] = useState<TABS_NAME>(
    isValidTab ? tabFromUrl : "personal",
  );

  async function loadLead() {
    const res = await fetch(`/api/leads/${id}`);
    if (!res.ok) { router.push("/leads"); return; }
    setLead(await res.json());
  }

  async function loadProducts() {
    const res = await fetch(`/api/leads/${id}/products`);
    if (res.ok) setProducts(await res.json());
  }

  useEffect(() => {
    void (async () => {
      const [leadRes, productsRes] = await Promise.all([
        fetch(`/api/leads/${id}`),
        fetch(`/api/leads/${id}/products`),
      ]);
      if (!leadRes.ok) { router.push("/leads"); return; }
      const [leadData, productsData] = await Promise.all([
        leadRes.json(),
        productsRes.ok ? productsRes.json() : Promise.resolve([]),
      ]);
      setLead(leadData);
      setProducts(productsData);
      setLoading(false);
    })();
  }, [id, router]);

  async function handleApprovalChange() {
    setLoading(true);
    await Promise.all([loadLead(), loadProducts()]);
    setLoading(false);
  }

  function handleSuspend() {
    toast("¿Suspender este lead?", {
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
            toast.error(data.error ?? "Error al suspender el lead");
            return;
          }
          toast.success("Lead suspendido");
          setLoading(true);
          await loadLead();
          setLoading(false);
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
      router.push(`/leads/${id}?${params.toString()}`, { scroll: false });
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

  if (loading) return <Loading />;
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <LeadDetailHeader
        lead={lead}
        role={role}
        onSuspend={handleSuspend}
        onEdit={() => setEditing(true)}
      />

      {role === UserRole.COACH || role === UserRole.SUPERVISOR || role === UserRole.ADMIN ? (
        <ProductChecklist
          leadId={lead.id}
          products={products}
          onApprovalChange={handleApprovalChange}
        />
      ) : null}

      <LeadDetailTabs activeTab={activeTab} onChange={handleTabChange} />

      <div className="max-h-[60vh] overflow-y-auto pr-2 pb-2">
        {activeTab === "personal" && <PersonalTab lead={lead} />}
        {activeTab === "notes" && <NotesTab leadId={lead.id} />}
        {activeTab === "reminders" && <RemindersTab leadId={lead.id} />}
        {activeTab === "attachments" && <AttachmentsTab leadId={lead.id} />}
        {activeTab === "products" && (
          <ProductsTab leadId={lead.id} onProductCreated={loadProducts} />
        )}
      </div>

      {editing && (
        <LeadEditModal
          key={lead.id}
          lead={lead}
          onClose={() => setEditing(false)}
          onSave={async () => {
            setEditing(false);
            setLoading(true);
            await loadLead();
            setLoading(false);
          }}
        />
      )}
    </div>
  );
}
