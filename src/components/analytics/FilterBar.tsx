"use client";

import { Filter, X } from "lucide-react";
import type { DatePreset, Operator } from "@/lib/types";
import { CONTACT_METHODS } from "@/lib/types";

type Props = {
  preset: DatePreset;
  setPreset: (v: DatePreset) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  keywordFilter: string;
  setKeywordFilter: (v: string) => void;
  provinceFilter: string;
  setProvinceFilter: (v: string) => void;
  cityFilter: string;
  setCityFilter: (v: string) => void;
  methodFilter: string;
  setMethodFilter: (v: string) => void;
  operatorFilter: string;
  setOperatorFilter: (v: string) => void;
  statuses: string[];
  keywords: string[];
  provinces: string[];
  cities: string[];
  operators: Operator[];
  activeFilterChips: Array<{ key: string; label: string }>;
  resetSingleFilter: (key: string) => void;
  resetAllFilters: () => void;
};

function SelectWithClear({
  value,
  onChange,
  onClear,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white"
      >
        {children}
      </select>
      {value !== "all" && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function FilterBar(props: Props) {
  const {
    preset, setPreset, startDate, setStartDate, endDate, setEndDate,
    statusFilter, setStatusFilter, keywordFilter, setKeywordFilter,
    provinceFilter, setProvinceFilter, cityFilter, setCityFilter,
    methodFilter, setMethodFilter, operatorFilter, setOperatorFilter,
    statuses, keywords, provinces, cities, operators,
    activeFilterChips, resetSingleFilter, resetAllFilters,
  } = props;

  return (
    <div className="glass-panel p-4 md:p-5">
      <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
        <Filter className="w-4 h-4" />
        <span>Stack filtri segmento</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-3">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as DatePreset)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="1d">1 giorno</option>
          <option value="7d">1 settimana</option>
          <option value="1m">1 mese</option>
          <option value="3m">3 mesi</option>
          <option value="12m">12 mesi</option>
          <option value="max">Intervallo massimo</option>
          <option value="custom">Personalizzata</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => { setPreset("custom"); setStartDate(e.target.value); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setPreset("custom"); setEndDate(e.target.value); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />

        <SelectWithClear value={statusFilter} onChange={setStatusFilter} onClear={() => setStatusFilter("all")}>
          <option value="all">Status: tutti</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectWithClear>

        <SelectWithClear value={keywordFilter} onChange={setKeywordFilter} onClear={() => setKeywordFilter("all")}>
          <option value="all">Keyword: tutte</option>
          {keywords.map((k) => <option key={k} value={k}>{k}</option>)}
        </SelectWithClear>

        <SelectWithClear value={provinceFilter} onChange={setProvinceFilter} onClear={() => setProvinceFilter("all")}>
          <option value="all">Provincia: tutte</option>
          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </SelectWithClear>

        <SelectWithClear value={cityFilter} onChange={setCityFilter} onClear={() => setCityFilter("all")}>
          <option value="all">Città: tutte</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectWithClear>

        <SelectWithClear value={methodFilter} onChange={setMethodFilter} onClear={() => setMethodFilter("all")}>
          <option value="all">Metodo: tutti</option>
          {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </SelectWithClear>

        {operators.length > 0 && (
          <SelectWithClear value={operatorFilter} onChange={setOperatorFilter} onClear={() => setOperatorFilter("all")}>
            <option value="all">Operatore: tutti</option>
            {operators.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
          </SelectWithClear>
        )}
      </div>

      {activeFilterChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => resetSingleFilter(chip.key)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/80 hover:bg-white/10"
            >
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-400/30 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/15"
          >
            Rimuovi tutti
          </button>
        </div>
      )}
    </div>
  );
}
