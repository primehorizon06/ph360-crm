import { TABS } from "@/utils/constants/leads";
import { TABS_NAME } from "@/utils/interfaces/leads";

interface Props {
  activeTab: TABS_NAME;
  onChange: (tab: TABS_NAME) => void;
}

export function LeadDetailTabs({ activeTab, onChange }: Props) {
  return (
    <div className="border-b border-white/10 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-1 min-w-max">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}