"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";
import { CustomSelect } from "@/components/ui/Select";
import { DashboardFiltersProps } from "@/utils/interfaces/dashboard";

export function DashboardFilters({
  showCompanySelector,
  companies,
  companyId,
  onCompanyChange,
  month,
  year,
  onDateChange,
  quincena,
  onQuincenaChange,
}: DashboardFiltersProps) {
  const selectCls =
    "text-lg px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer w-36";

  const selectedDate = new Date(year, month - 1, 1);

  const companyOptions = ["all", ...companies.map((c) => String(c.id))];
  const companyLabels = ["Todas", ...companies.map((c) => c.name)];

  return (
    <div className="flex flex-wrap items-end gap-2">
      {showCompanySelector && companies.length > 0 && (
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
            Franquicia
          </label>
          <CustomSelect
            name="franquicia"
            value={companyId}
            onChange={onCompanyChange}
            options={companyOptions}
            labels={companyLabels}
            searchable={companies.length > 5}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
          Período
        </label>
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date | null) => {
            if (!date) return;
            onDateChange(date.getMonth() + 1, date.getFullYear());
          }}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          locale={es}
          maxDate={new Date()}
          className={selectCls}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
          Quincena
        </label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {([1, 2] as const).map((q) => (
            <button
              key={q}
              onClick={() => onQuincenaChange(q)}
              className={`px-4 py-1.5 text-lg font-medium transition-colors ${
                quincena === q
                  ? "bg-cyan-500 text-white"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {q === 1 ? "1 – 15" : "16 – fin"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
