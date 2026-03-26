"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Filter,
  Mail,
  Phone,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type SavedClient = {
  id: string;
  business_name?: string | null;
  keyword?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  follow_up_date?: string | null;
  last_contact_method?: string | null;
  last_contact_date?: string | null;
  created_at?: string | null;
  notes?: string | null;
};

type ContactHistoryRow = {
  id: string;
  client_id: string;
  contact_method: string;
  contact_date: string;
  notes?: string | null;
};

type DatePreset = "1d" | "7d" | "1m" | "3m" | "12m" | "max" | "custom";

const CONTACT_METHODS = ["chiamata", "email", "messaggio", "nota"];

const toDateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const startOfDayIso = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const endOfDayIso = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

const subtractMonths = (base: Date, months: number) => {
  const next = new Date(base);
  next.setMonth(next.getMonth() - months);
  return next;
};

const daysBetweenInclusive = (from: string, to: string) => {
  const result: string[] = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    result.push(toDateInput(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
};

const scoreClient = (client: SavedClient, historyCount: number, today: Date) => {
  let score = 0;

  if (client.email) score += 20;
  if (client.phone) score += 20;
  if (client.keyword) score += 10;

  if (historyCount >= 3) score += 15;
  else if (historyCount >= 1) score += 8;

  const lc = client.last_contact_date ? new Date(client.last_contact_date) : null;
  if (!lc) score += 25;
  else {
    const hours = (today.getTime() - lc.getTime()) / (1000 * 60 * 60);
    if (hours > 96) score += 20;
    else if (hours > 48) score += 12;
    else if (hours > 24) score += 6;
  }

  if ((client.status || "").toLowerCase() === "convertiti") score -= 20;
  return Math.max(0, Math.min(100, score));
};

export function AnalyticsDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [history, setHistory] = useState<ContactHistoryRow[]>([]);

  const today = new Date();
  const [preset, setPreset] = useState<DatePreset>("1m");
  const [startDate, setStartDate] = useState(toDateInput(new Date(today.getTime() - 1000 * 60 * 60 * 24 * 29)));
  const [endDate, setEndDate] = useState(toDateInput(today));

  const [statusFilter, setStatusFilter] = useState("all");
  const [keywordFilter, setKeywordFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMethod, setBatchMethod] = useState("chiamata");
  const [batchStatus, setBatchStatus] = useState("unchanged");
  const [batchFollowUp, setBatchFollowUp] = useState(toDateInput(new Date(today.getTime() + 1000 * 60 * 60 * 24 * 7)));
  const [batchNotes, setBatchNotes] = useState("Contatto registrato da Analytics.");
  const [savingBatch, setSavingBatch] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [clientsRes, historyRes] = await Promise.all([
      supabase.from("saved_clients").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_history").select("id, client_id, contact_method, contact_date, notes").order("contact_date", { ascending: false }),
    ]);

    if (clientsRes.error) console.error(clientsRes.error);
    if (historyRes.error) console.error(historyRes.error);

    setClients((clientsRes.data || []) as SavedClient[]);
    setHistory((historyRes.data || []) as ContactHistoryRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const minAvailableDate = useMemo(() => {
    const candidates: string[] = [];
    clients.forEach((c) => {
      if (c.created_at) candidates.push(c.created_at.slice(0, 10));
    });
    history.forEach((h) => {
      if (h.contact_date) candidates.push(h.contact_date.slice(0, 10));
    });
    if (candidates.length === 0) return toDateInput(new Date());
    return candidates.sort()[0];
  }, [clients, history]);

  useEffect(() => {
    const now = new Date();
    if (preset === "1d") {
      const d = toDateInput(now);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "7d") {
      setStartDate(toDateInput(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6)));
      setEndDate(toDateInput(now));
    } else if (preset === "1m") {
      setStartDate(toDateInput(subtractMonths(now, 1)));
      setEndDate(toDateInput(now));
    } else if (preset === "3m") {
      setStartDate(toDateInput(subtractMonths(now, 3)));
      setEndDate(toDateInput(now));
    } else if (preset === "12m") {
      setStartDate(toDateInput(subtractMonths(now, 12)));
      setEndDate(toDateInput(now));
    } else if (preset === "max") {
      setStartDate(minAvailableDate);
      setEndDate(toDateInput(now));
    }
  }, [minAvailableDate, preset]);

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

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== "all" && (c.status || "Da contattare") !== statusFilter) return false;
      if (keywordFilter !== "all" && c.keyword !== keywordFilter) return false;
      if (provinceFilter !== "all" && c.province !== provinceFilter) return false;
      if (cityFilter !== "all" && c.city !== cityFilter) return false;

      if (c.created_at) {
        const created = c.created_at.slice(0, 10);
        if (created < startDate || created > endDate) return false;
      }

      return true;
    });
  }, [cityFilter, clients, endDate, keywordFilter, provinceFilter, startDate, statusFilter]);

  const filteredClientIds = useMemo(() => new Set(filteredClients.map((c) => c.id)), [filteredClients]);

  const filteredHistory = useMemo(() => {
    const from = startOfDayIso(startDate);
    const to = endOfDayIso(endDate);
    return history.filter((h) => {
      if (!filteredClientIds.has(h.client_id)) return false;
      if (h.contact_date < from || h.contact_date > to) return false;
      if (methodFilter !== "all" && h.contact_method !== methodFilter) return false;
      return true;
    });
  }, [endDate, filteredClientIds, history, methodFilter, startDate]);

  const chartHistory = useMemo(() => {
    const from = startOfDayIso(startDate);
    const to = endOfDayIso(endDate);
    return history.filter((h) => {
      if (!filteredClientIds.has(h.client_id)) return false;
      if (h.contact_date < from || h.contact_date > to) return false;
      return true;
    });
  }, [endDate, filteredClientIds, history, startDate]);

  const historyByClient = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      counts[h.client_id] = (counts[h.client_id] || 0) + 1;
    });
    return counts;
  }, [filteredHistory]);

  const kpis = useMemo(() => {
    const overdue = filteredClients.filter((c) => c.follow_up_date && c.follow_up_date < toDateInput(today)).length;
    const convertiti = filteredClients.filter((c) => (c.status || "").toLowerCase() === "convertiti").length;
    const conversionRate = filteredClients.length > 0 ? Math.round((convertiti / filteredClients.length) * 100) : 0;

    return {
      totalClients: filteredClients.length,
      totalActivities: filteredHistory.length,
      overdue,
      conversionRate,
    };
  }, [filteredClients, filteredHistory.length, today]);

  const activitiesByDay = useMemo(() => {
    const labels = daysBetweenInclusive(startDate, endDate);
    const counts: Record<string, number> = {};
    labels.forEach((d) => {
      counts[d] = 0;
    });
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

  // Stato per filtri delle serie del grafico
  const [activeSeries, setActiveSeries] = useState({
    created: true,
    calls: true,
    emails: true,
    total: true,
  });

  const toggleSeries = (key: keyof typeof activeSeries) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cartesianSeries = useMemo(() => {
    const labels = daysBetweenInclusive(startDate, endDate);
    const created: Record<string, number> = {};
    const calls: Record<string, number> = {};
    const emails: Record<string, number> = {};
    const totalContacts: Record<string, number> = {};

    labels.forEach((d) => {
      created[d] = 0;
      calls[d] = 0;
      emails[d] = 0;
      totalContacts[d] = 0;
    });

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

  const slaAlerts = useMemo(() => {
    const now = new Date();
    const noRecentContact = filteredClients.filter((c) => {
      if (!c.last_contact_date) return true;
      const h = (now.getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60);
      return h > 48;
    }).length;

    const overdueFollowUp = filteredClients.filter((c) => c.follow_up_date && c.follow_up_date < toDateInput(now)).length;

    return { noRecentContact, overdueFollowUp };
  }, [filteredClients]);

  const topPriority = useMemo(() => {
    const now = new Date();
    return filteredClients
      .map((c) => ({
        client: c,
        score: scoreClient(c, historyByClient[c.id] || 0, now),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [filteredClients, historyByClient]);

  useEffect(() => {
    if (selectedIds.length === 0) return;
    const selected = filteredClients.filter((c) => selectedIds.includes(c.id));
    if (selected.length === 0) return;

    const methodFreq: Record<string, number> = {};
    selected.forEach((c) => {
      const method = c.last_contact_method || "chiamata";
      methodFreq[method] = (methodFreq[method] || 0) + 1;
    });
    const topMethod = Object.entries(methodFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "chiamata";
    setBatchMethod(topMethod);
  }, [filteredClients, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredClients.map((c) => c.id));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetSingleFilter = (filter: "status" | "keyword" | "province" | "city" | "method" | "date") => {
    if (filter === "status") setStatusFilter("all");
    if (filter === "keyword") setKeywordFilter("all");
    if (filter === "province") setProvinceFilter("all");
    if (filter === "city") setCityFilter("all");
    if (filter === "method") setMethodFilter("all");
    if (filter === "date") setPreset("max");
  };

  const runBatchContact = async () => {
    if (selectedIds.length === 0) {
      alert("Seleziona almeno un cliente.");
      return;
    }

    setSavingBatch(true);
    const nowIso = new Date().toISOString();

    const updates: Partial<SavedClient> = {
      last_contact_method: batchMethod,
      last_contact_date: nowIso,
    };
    if (batchStatus !== "unchanged") updates.status = batchStatus;
    if (batchFollowUp) updates.follow_up_date = batchFollowUp;

    const { error: updateError } = await supabase
      .from("saved_clients")
      .update(updates)
      .in("id", selectedIds);

    if (updateError) {
      setSavingBatch(false);
      alert("Errore aggiornamento clienti: " + updateError.message);
      return;
    }

    const historyRows = selectedIds.map((id) => ({
      client_id: id,
      contact_method: batchMethod,
      contact_date: nowIso,
      notes: batchNotes || "Contatto registrato da Analytics.",
    }));

    const { error: historyError } = await supabase.from("contact_history").insert(historyRows);
    if (historyError) {
      setSavingBatch(false);
      alert("Aggiornati i clienti ma errore nello storico: " + historyError.message);
      return;
    }

    await fetchData();
    setSavingBatch(false);
    alert(`Contatto registrato su ${selectedIds.length} clienti.`);
  };

  const maxActivities = Math.max(1, ...activitiesByDay.map((d) => d.value));
  const maxStatus = Math.max(1, ...Object.values(byStatus));
  const maxCartesianY = Math.max(
    1,
    ...cartesianSeries.points.map((p) => Math.max(p.created, p.calls, p.emails, p.total))
  );

  const chartW = 920;
  const chartH = 290;
  const chartPad = { left: 44, right: 16, top: 16, bottom: 34 };
  const innerW = chartW - chartPad.left - chartPad.right;
  const innerH = chartH - chartPad.top - chartPad.bottom;

  const xFor = (index: number, totalPoints: number) => {
    if (totalPoints <= 1) return chartPad.left;
    return chartPad.left + (index / (totalPoints - 1)) * innerW;
  };
  const yFor = (value: number) => chartPad.top + innerH - (value / maxCartesianY) * innerH;

  const getPolylinePoints = (values: number[]) =>
    values
      .map((value, index) => `${xFor(index, values.length)},${yFor(value)}`)
      .join(" ");

  const renderSeriesDots = (values: number[], color: string) =>
    values.map((value, index) => {
      if (value <= 0) return null;
      const x = xFor(index, values.length);
      const y = yFor(value);
      return <circle key={`${color}-${index}`} cx={x} cy={y} r={3.2} fill={color} />;
    });

  const activeFilterChips = [
    statusFilter !== "all" ? { key: "status", label: `Status: ${statusFilter}` } : null,
    keywordFilter !== "all" ? { key: "keyword", label: `Keyword: ${keywordFilter}` } : null,
    provinceFilter !== "all" ? { key: "province", label: `Provincia: ${provinceFilter}` } : null,
    cityFilter !== "all" ? { key: "city", label: `Città: ${cityFilter}` } : null,
    methodFilter !== "all" ? { key: "method", label: `Metodo: ${methodFilter}` } : null,
    preset !== "max" ? { key: "date", label: `Data: ${startDate} → ${endDate}` } : null,
  ].filter(Boolean) as Array<{ key: "status" | "keyword" | "province" | "city" | "method" | "date"; label: string }>;

  if (loading) {
    return <div className="text-center p-8 text-white/50">Caricamento analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm text-white/70">Trend operativo su asse cartesiano</h3>
            <p className="text-xs text-white/45 mt-1">Andamento giornaliero di inserimenti e attività contatto nel periodo filtrato.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Filtro serie: Contatti inseriti */}
            <button
              className={`px-2 py-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 flex items-center gap-1 ${activeSeries.created ? '' : 'opacity-50'}`}
              onClick={() => toggleSeries('created')}
              type="button"
            >
              Contatti inseriti: {cartesianSeries.totals.inserted}
              {activeSeries.created ? (
                <span className="ml-1 text-cyan-200">×</span>
              ) : (
                <span className="ml-1 text-cyan-200">+</span>
              )}
            </button>
            {/* Filtro serie: Chiamate */}
            <button
              className={`px-2 py-1 rounded-full border border-blue-400/40 bg-blue-400/10 text-blue-200 flex items-center gap-1 ${activeSeries.calls ? '' : 'opacity-50'}`}
              onClick={() => toggleSeries('calls')}
              type="button"
            >
              Chiamate: {cartesianSeries.totals.calls}
              {activeSeries.calls ? (
                <span className="ml-1 text-blue-200">×</span>
              ) : (
                <span className="ml-1 text-blue-200">+</span>
              )}
            </button>
            {/* Filtro serie: Email */}
            <button
              className={`px-2 py-1 rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200 flex items-center gap-1 ${activeSeries.emails ? '' : 'opacity-50'}`}
              onClick={() => toggleSeries('emails')}
              type="button"
            >
              Email: {cartesianSeries.totals.emails}
              {activeSeries.emails ? (
                <span className="ml-1 text-fuchsia-200">×</span>
              ) : (
                <span className="ml-1 text-fuchsia-200">+</span>
              )}
            </button>
            {/* Filtro serie: Totale contatti */}
            <button
              className={`px-2 py-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-200 flex items-center gap-1 ${activeSeries.total ? '' : 'opacity-50'}`}
              onClick={() => toggleSeries('total')}
              type="button"
            >
              Totale contatti: {cartesianSeries.totals.totalContacts}
              {activeSeries.total ? (
                <span className="ml-1 text-emerald-200">×</span>
              ) : (
                <span className="ml-1 text-emerald-200">+</span>
              )}
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[760px] h-[300px]">
            {[0, 1, 2, 3, 4].map((step) => {
              const y = chartPad.top + (innerH / 4) * step;
              const label = Math.round(maxCartesianY - (maxCartesianY / 4) * step);
              return (
                <g key={step}>
                  <line x1={chartPad.left} y1={y} x2={chartW - chartPad.right} y2={y} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                  <text x={chartPad.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.55)" fontSize="11">{label}</text>
                </g>
              );
            })}

            <line x1={chartPad.left} y1={chartPad.top} x2={chartPad.left} y2={chartH - chartPad.bottom} stroke="rgba(255,255,255,0.35)" />
            <line x1={chartPad.left} y1={chartH - chartPad.bottom} x2={chartW - chartPad.right} y2={chartH - chartPad.bottom} stroke="rgba(255,255,255,0.35)" />

            {activeSeries.created && (
              <>
                <polyline fill="none" stroke="#22d3ee" strokeWidth="2.4" points={getPolylinePoints(cartesianSeries.points.map((p) => p.created))} />
                {renderSeriesDots(cartesianSeries.points.map((p) => p.created), "#22d3ee")}
              </>
            )}
            {activeSeries.calls && (
              <>
                <polyline fill="none" stroke="#60a5fa" strokeWidth="2.4" points={getPolylinePoints(cartesianSeries.points.map((p) => p.calls))} />
                {renderSeriesDots(cartesianSeries.points.map((p) => p.calls), "#60a5fa")}
              </>
            )}
            {activeSeries.emails && (
              <>
                <polyline fill="none" stroke="#e879f9" strokeWidth="2.4" points={getPolylinePoints(cartesianSeries.points.map((p) => p.emails))} />
                {renderSeriesDots(cartesianSeries.points.map((p) => p.emails), "#e879f9")}
              </>
            )}
            {activeSeries.total && (
              <>
                <polyline fill="none" stroke="#34d399" strokeWidth="2.8" points={getPolylinePoints(cartesianSeries.points.map((p) => p.total))} />
                {renderSeriesDots(cartesianSeries.points.map((p) => p.total), "#34d399")}
              </>
            )}

            {cartesianSeries.points.map((point, index) => {
              const x = xFor(index, cartesianSeries.points.length);
              const isFirst = index === 0;
              const isMiddle = index === Math.floor(cartesianSeries.points.length / 2);
              const isLast = index === cartesianSeries.points.length - 1;
              if (!isFirst && !isMiddle && !isLast) return null;

              return (
                <g key={point.label}>
                  <line x1={x} y1={chartH - chartPad.bottom} x2={x} y2={chartH - chartPad.bottom + 5} stroke="rgba(255,255,255,0.45)" />
                  <text x={x} y={chartH - chartPad.bottom + 18} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">
                    {new Date(`${point.label}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap gap-3 text-xs mt-2">
          <span className="inline-flex items-center gap-2 text-cyan-200"><span className="w-3 h-[2px] bg-cyan-400" />Contatti inseriti</span>
          <span className="inline-flex items-center gap-2 text-blue-200"><span className="w-3 h-[2px] bg-blue-400" />Chiamate effettuate</span>
          <span className="inline-flex items-center gap-2 text-fuchsia-200"><span className="w-3 h-[2px] bg-fuchsia-400" />Email inviate</span>
          <span className="inline-flex items-center gap-2 text-emerald-200"><span className="w-3 h-[2px] bg-emerald-400" />Totale contatti</span>
        </div>
      </div>

      <div className="glass-panel p-4 md:p-5">
        <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
          <Filter className="w-4 h-4" />
          <span>Stack filtri segmento</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-3">
          <select value={preset} onChange={(e) => setPreset(e.target.value as DatePreset)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option value="1d">1 giorno</option>
            <option value="7d">1 settimana</option>
            <option value="1m">1 mese</option>
            <option value="3m">3 mesi</option>
            <option value="12m">12 mesi</option>
            <option value="max">Intervallo massimo</option>
            <option value="custom">Personalizzata</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => { setPreset("custom"); setStartDate(e.target.value); }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
          <input type="date" value={endDate} onChange={(e) => { setPreset("custom"); setEndDate(e.target.value); }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />

          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white">
              <option value="all">Status: tutti</option>
              {statuses.map((status) => (<option key={status} value={status}>{status}</option>))}
            </select>
            {statusFilter !== "all" && (
              <button onClick={() => setStatusFilter("all")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" title="Rimuovi filtro status">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <select value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white">
              <option value="all">Keyword: tutte</option>
              {keywords.map((keyword) => (<option key={keyword} value={keyword}>{keyword}</option>))}
            </select>
            {keywordFilter !== "all" && (
              <button onClick={() => setKeywordFilter("all")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" title="Rimuovi filtro keyword">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white">
              <option value="all">Provincia: tutte</option>
              {provinces.map((province) => (<option key={province} value={province}>{province}</option>))}
            </select>
            {provinceFilter !== "all" && (
              <button onClick={() => setProvinceFilter("all")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" title="Rimuovi filtro provincia">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white">
              <option value="all">Città: tutte</option>
              {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
            </select>
            {cityFilter !== "all" && (
              <button onClick={() => setCityFilter("all")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" title="Rimuovi filtro città">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white">
              <option value="all">Metodo: tutti</option>
              {CONTACT_METHODS.map((method) => (<option key={method} value={method}>{method}</option>))}
            </select>
            {methodFilter !== "all" && (
              <button onClick={() => setMethodFilter("all")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" title="Rimuovi filtro metodo">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => resetSingleFilter(chip.key)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/80 hover:bg-white/10"
                title="Rimuovi filtro"
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={() => {
                setStatusFilter("all");
                setKeywordFilter("all");
                setProvinceFilter("all");
                setCityFilter("all");
                setMethodFilter("all");
                setPreset("max");
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-400/30 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/15"
            >
              Rimuovi tutti
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="glass-panel p-4"><div className="text-white/50 text-xs">Clienti segmento</div><div className="text-2xl font-semibold mt-1">{kpis.totalClients}</div><Users className="w-4 h-4 mt-2 text-brand-accent" /></div>
        <div className="glass-panel p-4"><div className="text-white/50 text-xs">Attività periodo</div><div className="text-2xl font-semibold mt-1">{kpis.totalActivities}</div><BarChart3 className="w-4 h-4 mt-2 text-brand-accent" /></div>
        <div className="glass-panel p-4"><div className="text-white/50 text-xs">Follow-up in ritardo</div><div className="text-2xl font-semibold mt-1">{kpis.overdue}</div><CalendarDays className="w-4 h-4 mt-2 text-amber-300" /></div>
        <div className="glass-panel p-4"><div className="text-white/50 text-xs">Conversione segmento</div><div className="text-2xl font-semibold mt-1">{kpis.conversionRate}%</div><TrendingUp className="w-4 h-4 mt-2 text-emerald-300" /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm text-white/70 mb-3">Attività giornaliere (dinamico)</h3>
          <div className="space-y-2">
            {activitiesByDay.map((point) => (
              <div key={point.label} className="flex items-center gap-2">
                <span className="text-xs text-white/40 w-20">{new Date(`${point.label}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</span>
                <div className="h-2 rounded-full bg-white/10 flex-1 overflow-hidden">
                  <div className="h-2 rounded-full bg-brand-accent" style={{ width: `${(point.value / maxActivities) * 100}%` }} />
                </div>
                <span className="text-xs text-white/60 w-7 text-right">{point.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm text-white/70 mb-3">Pipeline per stato</h3>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, value]) => (
              <div key={status} className="flex items-center gap-2">
                <span className="text-xs text-white/40 w-36 truncate">{status}</span>
                <div className="h-2 rounded-full bg-white/10 flex-1 overflow-hidden">
                  <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${(value / maxStatus) * 100}%` }} />
                </div>
                <span className="text-xs text-white/60 w-7 text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-4 pt-3">
            <div className="text-xs text-white/50 mb-2">Canali contatto</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {CONTACT_METHODS.map((method) => (
                <span key={method} className="px-2 py-1 rounded-full border border-white/15 bg-white/5 text-white/75">
                  {method}: {byMethod[method] || 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm text-white/70 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-300" /> SLA & Alert (extra)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Lead senza contatto recente (&gt;48h)</span><span className="font-medium">{slaAlerts.noRecentContact}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Follow-up scaduti</span><span className="font-medium">{slaAlerts.overdueFollowUp}</span></div>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm text-white/70 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-300" /> Priorità lead scoring (extra)</h3>
          <div className="space-y-2">
            {topPriority.map(({ client, score }) => (
              <div key={client.id} className="flex items-center justify-between text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02]">
                <div>
                  <div className="font-medium text-white">{client.business_name || "Cliente"}</div>
                  {client.phone && (
                    <div className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </div>
                  )}
                  <div className="text-xs text-white/45">{client.city || "-"} {client.province ? `(${client.province})` : ""}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border border-white/20 bg-white/5">Score {score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-sm text-white/70 mb-3">Strumento contatto batch (clienti selezionati)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4">
          <select value={batchMethod} onChange={(e) => setBatchMethod(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {CONTACT_METHODS.filter((m) => m !== "nota").map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
          <select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option value="unchanged">Status invariato</option>
            {statuses.map((status) => (<option key={status} value={status}>{status}</option>))}
          </select>
          <input type="date" value={batchFollowUp} onChange={(e) => setBatchFollowUp(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
          <input value={batchNotes} onChange={(e) => setBatchNotes(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white lg:col-span-2" placeholder="Note contatto" />
        </div>

        <div className="flex items-center justify-between mb-3 text-sm">
          <label className="flex items-center gap-2 text-white/70">
            <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filteredClients.length} onChange={toggleSelectAll} className="rounded border-white/20 bg-black/50" />
            Seleziona tutti i clienti del segmento ({filteredClients.length})
          </label>
          <button onClick={runBatchContact} disabled={savingBatch || selectedIds.length === 0} className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {savingBatch ? "Salvataggio..." : `Registra contatto (${selectedIds.length})`}
          </button>
        </div>

        <div className="max-h-72 overflow-auto border border-white/10 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-3 py-2 w-10"></th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Contatti</th>
                <th className="px-3 py-2 text-left">Ultimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelectOne(c.id)} className="rounded border-white/20 bg-black/50" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{c.business_name || "Cliente"}</div>
                    <div className="text-xs text-white/40">{c.city || "-"} {c.province ? `(${c.province})` : ""}</div>
                  </td>
                  <td className="px-3 py-2 text-white/70">{c.status || "Da contattare"}</td>
                  <td className="px-3 py-2 text-white/70">
                    <div className="flex gap-2">
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-white/60">{c.last_contact_date ? new Date(c.last_contact_date).toLocaleDateString("it-IT") : "Mai"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}