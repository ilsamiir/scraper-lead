"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { SavedClient, ContactHistoryRow, Operator, DatePreset } from "@/lib/types";
import { CONTACT_METHODS } from "@/lib/types";
import {
  toDateInput,
  startOfDayIso,
  endOfDayIso,
  subtractMonths,
  daysBetweenInclusive,
} from "@/lib/date-utils";
import { scoreClientTotal } from "@/lib/scoring";

export function useAnalyticsData() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [history, setHistory] = useState<ContactHistoryRow[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  const todayRef = useRef(new Date());
  const today = todayRef.current;

  // --- Filtri ---
  const [preset, setPreset] = useState<DatePreset>("1m");
  const [startDate, setStartDate] = useState(
    toDateInput(new Date(today.getTime() - 1000 * 60 * 60 * 24 * 29))
  );
  const [endDate, setEndDate] = useState(toDateInput(today));
  const [statusFilter, setStatusFilter] = useState("all");
  const [keywordFilter, setKeywordFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [operatorFilter, setOperatorFilter] = useState("all");

  // --- Fetch ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [clientsRes, historyRes, operatorsRes] = await Promise.all([
      supabase.from("saved_clients").select("*").order("created_at", { ascending: false }),
      supabase
        .from("contact_history")
        .select("id, client_id, contact_method, contact_date, notes, operator_id")
        .order("contact_date", { ascending: false }),
      supabase.from("operators").select("*").eq("active", true).order("name"),
    ]);

    if (clientsRes.error) console.error(clientsRes.error);
    if (historyRes.error) console.error(historyRes.error);
    if (operatorsRes.error) console.error(operatorsRes.error);

    setClients((clientsRes.data || []) as SavedClient[]);
    setHistory((historyRes.data || []) as ContactHistoryRow[]);
    setOperators((operatorsRes.data || []) as Operator[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Date preset ---
  const minAvailableDate = useMemo(() => {
    const candidates: string[] = [];
    clients.forEach((c) => {
      if (c.created_at) candidates.push(c.created_at.slice(0, 10));
    });
    history.forEach((h) => {
      if (h.contact_date) candidates.push(h.contact_date.slice(0, 10));
    });
    return candidates.length ? candidates.sort()[0] : toDateInput(new Date());
  }, [clients, history]);

  useEffect(() => {
    const now = new Date();
    const presetMap: Record<string, () => void> = {
      "1d": () => { const d = toDateInput(now); setStartDate(d); setEndDate(d); },
      "7d": () => { setStartDate(toDateInput(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6))); setEndDate(toDateInput(now)); },
      "1m": () => { setStartDate(toDateInput(subtractMonths(now, 1))); setEndDate(toDateInput(now)); },
      "3m": () => { setStartDate(toDateInput(subtractMonths(now, 3))); setEndDate(toDateInput(now)); },
      "12m": () => { setStartDate(toDateInput(subtractMonths(now, 12))); setEndDate(toDateInput(now)); },
      "max": () => { setStartDate(minAvailableDate); setEndDate(toDateInput(now)); },
    };
    presetMap[preset]?.();
  }, [minAvailableDate, preset]);

  // --- Opzioni filtro ---
  const statuses = useMemo(
    () => Array.from(new Set(clients.map((c) => c.status || "Da contattare"))).sort(),
    [clients]
  );
  const keywords = useMemo(
    () => Array.from(new Set(clients.map((c) => c.keyword).filter(Boolean) as string[])).sort(),
    [clients]
  );
  const provinces = useMemo(
    () => Array.from(new Set(clients.map((c) => c.province).filter(Boolean) as string[])).sort(),
    [clients]
  );
  const cities = useMemo(
    () => Array.from(new Set(clients.map((c) => c.city).filter(Boolean) as string[])).sort(),
    [clients]
  );

  // --- Filtering ---
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== "all" && (c.status || "Da contattare") !== statusFilter) return false;
      if (keywordFilter !== "all" && c.keyword !== keywordFilter) return false;
      if (provinceFilter !== "all" && c.province !== provinceFilter) return false;
      if (cityFilter !== "all" && c.city !== cityFilter) return false;
      if (operatorFilter !== "all" && c.operator_id !== operatorFilter) return false;
      if (c.created_at) {
        const created = c.created_at.slice(0, 10);
        if (created < startDate || created > endDate) return false;
      }
      return true;
    });
  }, [cityFilter, clients, endDate, keywordFilter, operatorFilter, provinceFilter, startDate, statusFilter]);

  const filteredClientIds = useMemo(() => new Set(filteredClients.map((c) => c.id)), [filteredClients]);

  const filteredHistory = useMemo(() => {
    const from = startOfDayIso(startDate);
    const to = endOfDayIso(endDate);
    return history.filter((h) => {
      if (!filteredClientIds.has(h.client_id)) return false;
      if (h.contact_date < from || h.contact_date > to) return false;
      if (methodFilter !== "all" && h.contact_method !== methodFilter) return false;
      if (operatorFilter !== "all" && h.operator_id !== operatorFilter) return false;
      return true;
    });
  }, [endDate, filteredClientIds, history, methodFilter, operatorFilter, startDate]);

  // Chart history senza filtro metodo (per serie cartesiano)
  const chartHistory = useMemo(() => {
    const from = startOfDayIso(startDate);
    const to = endOfDayIso(endDate);
    return history.filter((h) => {
      if (!filteredClientIds.has(h.client_id)) return false;
      if (h.contact_date < from || h.contact_date > to) return false;
      return true;
    });
  }, [endDate, filteredClientIds, history, startDate]);

  // History count per client (usa tutta la history, non filtrata per metodo)
  const historyByClient = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach((h) => {
      counts[h.client_id] = (counts[h.client_id] || 0) + 1;
    });
    return counts;
  }, [history]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const todayStr = toDateInput(today);
    const overdue = filteredClients.filter((c) => c.follow_up_date && c.follow_up_date < todayStr).length;
    const convertiti = filteredClients.filter((c) => (c.status || "").toLowerCase() === "convertiti").length;
    const conversionRate = filteredClients.length > 0 ? Math.round((convertiti / filteredClients.length) * 100) : 0;

    // Tempo medio conversione
    const conversionTimes: number[] = [];
    filteredClients.forEach((c) => {
      if (c.converted_at && c.created_at) {
        const days = (new Date(c.converted_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) conversionTimes.push(days);
      }
    });
    const avgConversionDays = conversionTimes.length > 0
      ? Math.round(conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length)
      : null;

    // Valore totale conversioni
    const totalConvertedValue = filteredClients.reduce(
      (sum, c) => sum + (c.converted_value ?? 0),
      0
    );

    return {
      totalClients: filteredClients.length,
      totalActivities: filteredHistory.length,
      overdue,
      conversionRate,
      convertiti,
      avgConversionDays,
      totalConvertedValue,
    };
  }, [filteredClients, filteredHistory.length, today]);

  // --- Chart data ---
  const activitiesByDay = useMemo(() => {
    const labels = daysBetweenInclusive(startDate, endDate);
    const counts: Record<string, number> = {};
    labels.forEach((d) => { counts[d] = 0; });
    filteredHistory.forEach((item) => {
      const d = item.contact_date.slice(0, 10);
      if (counts[d] !== undefined) counts[d] += 1;
    });
    return labels.map((label) => ({ label, value: counts[label] || 0 }));
  }, [endDate, filteredHistory, startDate]);

  const byMethod = useMemo(() => {
    const out: Record<string, number> = {};
    filteredHistory.forEach((item) => {
      out[item.contact_method] = (out[item.contact_method] || 0) + 1;
    });
    return out;
  }, [filteredHistory]);

  const byStatus = useMemo(() => {
    const out: Record<string, number> = {};
    filteredClients.forEach((item) => {
      const s = item.status || "Da contattare";
      out[s] = (out[s] || 0) + 1;
    });
    return out;
  }, [filteredClients]);

  const cartesianSeries = useMemo(() => {
    const labels = daysBetweenInclusive(startDate, endDate);
    const created: Record<string, number> = {};
    const calls: Record<string, number> = {};
    const emails: Record<string, number> = {};
    const totalContacts: Record<string, number> = {};

    labels.forEach((d) => { created[d] = 0; calls[d] = 0; emails[d] = 0; totalContacts[d] = 0; });

    filteredClients.forEach((client) => {
      if (!client.created_at) return;
      const d = client.created_at.slice(0, 10);
      if (created[d] !== undefined) created[d] += 1;
    });

    chartHistory.forEach((row) => {
      const d = row.contact_date.slice(0, 10);
      if (totalContacts[d] === undefined) return;
      totalContacts[d] += 1;
      if (row.contact_method === "chiamata") calls[d] += 1;
      if (row.contact_method === "email") emails[d] += 1;
    });

    const points = labels.map((label) => ({
      label,
      created: created[label] || 0,
      calls: calls[label] || 0,
      emails: emails[label] || 0,
      total: totalContacts[label] || 0,
    }));

    return {
      points,
      totals: {
        inserted: points.reduce((acc, p) => acc + p.created, 0),
        calls: points.reduce((acc, p) => acc + p.calls, 0),
        emails: points.reduce((acc, p) => acc + p.emails, 0),
        totalContacts: points.reduce((acc, p) => acc + p.total, 0),
      },
    };
  }, [chartHistory, endDate, filteredClients, startDate]);

  // --- SLA Alerts ---
  const slaAlerts = useMemo(() => {
    const now = new Date();
    const todayStr = toDateInput(now);
    const noRecentContact = filteredClients.filter((c) => {
      if (!c.last_contact_date) return true;
      const h = (now.getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60);
      return h > 48;
    }).length;
    const overdueFollowUp = filteredClients.filter((c) => c.follow_up_date && c.follow_up_date < todayStr).length;
    return { noRecentContact, overdueFollowUp };
  }, [filteredClients]);

  // --- Top Priority (scoring) ---
  const topPriority = useMemo(() => {
    const now = new Date();
    return filteredClients
      .map((c) => ({
        client: c,
        score: scoreClientTotal(c, historyByClient[c.id] || 0, now),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [filteredClients, historyByClient]);

  // --- Funnel data ---
  const funnelData = useMemo(() => {
    const stages = ["Da contattare", "In lavorazione", "Da richiamare", "Convertiti"];
    return stages.map((stage) => ({
      name: stage,
      value: filteredClients.filter((c) => (c.status || "Da contattare") === stage).length,
    }));
  }, [filteredClients]);

  // --- Operator stats ---
  const operatorStats = useMemo(() => {
    if (operators.length === 0) return [];

    return operators.map((op) => {
      const opHistory = filteredHistory.filter((h) => h.operator_id === op.id);
      const opClients = filteredClients.filter((c) => c.operator_id === op.id);
      const convertiti = opClients.filter((c) => (c.status || "").toLowerCase() === "convertiti").length;

      const byCh: Record<string, number> = {};
      CONTACT_METHODS.forEach((m) => { byCh[m] = 0; });
      opHistory.forEach((h) => {
        if (byCh[h.contact_method] !== undefined) byCh[h.contact_method] += 1;
      });

      return {
        operator: op,
        totalActivities: opHistory.length,
        totalClients: opClients.length,
        convertiti,
        conversionRate: opClients.length > 0 ? Math.round((convertiti / opClients.length) * 100) : 0,
        byMethod: byCh,
        totalValue: opClients.reduce((sum, c) => sum + (c.converted_value ?? 0), 0),
      };
    }).sort((a, b) => b.totalActivities - a.totalActivities);
  }, [filteredClients, filteredHistory, operators]);

  // --- Reset filtri ---
  const resetSingleFilter = (filter: string) => {
    const resetMap: Record<string, () => void> = {
      status: () => setStatusFilter("all"),
      keyword: () => setKeywordFilter("all"),
      province: () => setProvinceFilter("all"),
      city: () => setCityFilter("all"),
      method: () => setMethodFilter("all"),
      operator: () => setOperatorFilter("all"),
      date: () => setPreset("max"),
    };
    resetMap[filter]?.();
  };

  const resetAllFilters = () => {
    setStatusFilter("all");
    setKeywordFilter("all");
    setProvinceFilter("all");
    setCityFilter("all");
    setMethodFilter("all");
    setOperatorFilter("all");
    setPreset("max");
  };

  const activeFilterChips = [
    statusFilter !== "all" ? { key: "status", label: `Status: ${statusFilter}` } : null,
    keywordFilter !== "all" ? { key: "keyword", label: `Keyword: ${keywordFilter}` } : null,
    provinceFilter !== "all" ? { key: "province", label: `Provincia: ${provinceFilter}` } : null,
    cityFilter !== "all" ? { key: "city", label: `Città: ${cityFilter}` } : null,
    methodFilter !== "all" ? { key: "method", label: `Metodo: ${methodFilter}` } : null,
    operatorFilter !== "all" ? { key: "operator", label: `Operatore: ${operators.find((o) => o.id === operatorFilter)?.name ?? operatorFilter}` } : null,
    preset !== "max" ? { key: "date", label: `Data: ${startDate} → ${endDate}` } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  return {
    loading,
    clients,
    history,
    operators,
    today,
    fetchData,
    // Filters
    preset, setPreset,
    startDate, setStartDate,
    endDate, setEndDate,
    statusFilter, setStatusFilter,
    keywordFilter, setKeywordFilter,
    provinceFilter, setProvinceFilter,
    cityFilter, setCityFilter,
    methodFilter, setMethodFilter,
    operatorFilter, setOperatorFilter,
    // Filter options
    statuses, keywords, provinces, cities,
    // Filtered data
    filteredClients,
    filteredHistory,
    historyByClient,
    // KPIs
    kpis,
    // Charts
    activitiesByDay,
    byMethod,
    byStatus,
    cartesianSeries,
    // Alerts & scoring
    slaAlerts,
    topPriority,
    // Advanced
    funnelData,
    operatorStats,
    // Filter chips
    activeFilterChips,
    resetSingleFilter,
    resetAllFilters,
    supabase,
  };
}
