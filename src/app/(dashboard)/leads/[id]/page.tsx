"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loading } from "@/components/ui/Loading";
import { LeadEditModal } from "@/components/leads/LeadEditModal";
import { Lead, TABS_NAME } from "@/utils/interfaces/leads";
import { LeadDetailHeader } from "../detail/LeadDetailHeader";
import { LeadDetailTabs } from "../detail/LeadDetailTabs";
import { PersonalTab } from "../detail/tabs/PersonalTab";

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TABS_NAME>("personal");

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

      <LeadDetailTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="max-h-[60vh] overflow-y-auto pr-2 pb-2">
        {activeTab === "personal" && <PersonalTab lead={lead} />}
        {/* {activeTab === "notes" && <ComingSoon label="Notas" />}
        {activeTab === "reminders" && <ComingSoon label="Recordatorios" />}
        {activeTab === "documents" && <ComingSoon label="Adjuntos" />}
        {activeTab === "products" && <ComingSoon label="Productos" />} */}
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
