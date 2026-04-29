"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loading } from "@/components/ui/Loading";
import { LeadEditModal } from "@/components/leads/LeadEditModal";
import { Lead, TABS_NAME } from "@/utils/interfaces/leads";
import { LeadDetailHeader } from "@/app/(dashboard)/leads/detail/LeadDetailHeader";
import { LeadDetailTabs } from "@/app/(dashboard)/leads/detail/LeadDetailTabs";
import { PersonalTab } from "@/app/(dashboard)/leads/detail/tabs/PersonalTab";
import { NotesTab } from "@/app/(dashboard)/leads/detail/tabs/NotesTab";
import { RemindersTab } from "@/app/(dashboard)/leads/detail/tabs/RemindersTab";
import { AttachmentsTab } from "@/app/(dashboard)/leads/detail/tabs/AttachmentsTab";
import { ProductsTab } from "@/app/(dashboard)/leads/detail/tabs/ProductsTab";
import { ProductChecklist } from "@/components/leads/ProductChecklist/ProductChecklist";
import { Product } from "@/utils/interfaces/products";
import { VALID_TABS } from "@/utils/constants/leads";

export default function CustomerDetailPage() {
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

  const tabFromUrl = searchParams.get("tab") as TABS_NAME;
  const isValidTab = tabFromUrl && VALID_TABS.includes(tabFromUrl);

  const [activeTab, setActiveTab] = useState<TABS_NAME>(
    isValidTab ? tabFromUrl : "personal",
  );

  async function loadLead() {
    setLoading(true);
    const res = await fetch(`/api/leads/${id}`);
    if (!res.ok) {
      router.push("/customers");
      return;
    }
    const data = await res.json();
    // Asegurarse que es un cliente
    if (data.type !== "customer") {
      router.push("/customers");
      return;
    }
    setLead(data);
    setLoading(false);
  }

  async function loadProducts() {
    const res = await fetch(`/api/leads/${id}/products`);
    if (res.ok) setProducts(await res.json());
  }

  useEffect(() => {
    Promise.all([loadLead(), loadProducts()]);
  }, [id]);

  async function handleApprovalChange() {
    await Promise.all([loadLead(), loadProducts()]);
  }

  async function handleSuspend() {
    if (!confirm("¿Suspender este cliente?")) return;
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "suspended" }),
    });
    loadLead();
  }

  const handleTabChange = (tab: TABS_NAME) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    startTransition(() => {
      router.push(`/customers/${id}?${params.toString()}`, { scroll: false });
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

      {role === "COACH" ||
        (role === "SUPERVISOR" && (
          <ProductChecklist
            leadId={lead.id}
            products={products}
            onApprovalChange={handleApprovalChange}
          />
        ))}

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
          type="customer"
          key={lead.id}
          lead={lead}
          onClose={() => setEditing(false)}
          onSave={() => {
            setEditing(false);
            loadLead();
          }}
        />
      )}
    </div>
  );
}
