"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  // Obtener la tab de la URL directamente
  const tabFromUrl = searchParams.get("tab") as TABS_NAME;
  const isValidTab =
    tabFromUrl && ["personal", "notes", "reminders"].includes(tabFromUrl);

  const [activeTab, setActiveTab] = useState<TABS_NAME>(
    isValidTab ? tabFromUrl : "personal",
  );

  async function loadLead() {
    setLoading(true);
    const res = await fetch(`/api/leads/${id}`);
    if (!res.ok) {
      router.push("/leads");
      return;
    }
    setLead(await res.json());
    setLoading(false);
  }

  async function handleSuspend() {
    if (!confirm("¿Suspender este lead?")) return;
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
      router.push(`/leads/${id}?${params.toString()}`, { scroll: false });
    });
  };

  // Escuchar cambios en la URL (para botones atrás/adelante)
  useEffect(() => {
    const handlePopState = () => {
      const newTab = searchParams.get("tab") as TABS_NAME;
      if (
        newTab &&
        ["personal", "notes", "reminders", "attachments", "products"].includes(
          newTab,
        )
      ) {
        setActiveTab(newTab);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [searchParams]);

  useEffect(() => {
    loadLead();
  }, [id]);

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

      <LeadDetailTabs activeTab={activeTab} onChange={handleTabChange} />

      <div className="max-h-[60vh] overflow-y-auto pr-2 pb-2">
        {activeTab === "personal" && <PersonalTab lead={lead} />}
        {activeTab === "notes" && <NotesTab leadId={lead.id} />}
        {activeTab === "reminders" && <RemindersTab leadId={lead.id} />}
        {activeTab === "attachments" && <AttachmentsTab leadId={lead.id} />}
        {activeTab === "products" && <ProductsTab leadId={lead.id} />}
      </div>

      {editing && (
        <LeadEditModal
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
