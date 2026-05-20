"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, Loader2, Mail, Phone, Send, FileText } from "lucide-react";

type ContactHistoryRow = {
    id: string;
    contact_method: string;
    contact_date: string;
    notes: string | null;
    saved_clients?: {
        business_name?: string | null;
        city?: string | null;
        province?: string | null;
        email?: string | null;
        phone?: string | null;
        website?: string | null;
    } | null;
};

const METHOD_OPTIONS = [
    { value: "tutti", label: "Tutti" },
    { value: "email", label: "Email" },
    { value: "chiamata", label: "Telefono" },
    { value: "messaggio", label: "App/Messaggio" },
    { value: "nota", label: "Nota" }
];

const getMethodLabel = (method: string) => {
    switch (method) {
        case "chiamata":
            return "Telefono";
        case "messaggio":
            return "App/Messaggio";
        case "email":
            return "Email";
        case "nota":
            return "Nota";
        default:
            return method;
    }
};

const getMethodIcon = (method: string) => {
    switch (method) {
        case "chiamata":
            return <Phone className="w-4 h-4 text-blue-400" />;
        case "email":
            return <Mail className="w-4 h-4 text-brand-accent" />;
        case "messaggio":
            return <Send className="w-4 h-4 text-green-400" />;
        case "nota":
            return <FileText className="w-4 h-4 text-purple-400" />;
        default:
            return <CalendarIcon className="w-4 h-4 text-brand-muted" />;
    }
};

const getTodayDateInput = () => {
    const today = new Date();
    return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
};

export function DailyReportTable() {
    const [rows, setRows] = useState<ContactHistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDateInput());
    const [methodFilter, setMethodFilter] = useState("tutti");
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const supabase = createClient();

    const fetchDailyReport = useCallback(async () => {
        setLoading(true);
        setExpandedRowId(null);
        const start = new Date(`${selectedDate}T00:00:00`);
        const end = new Date(`${selectedDate}T23:59:59.999`);

        let query = supabase
            .from("contact_history")
            .select("id, contact_method, contact_date, notes, saved_clients (business_name, city, province, email, phone, website)")
            .gte("contact_date", start.toISOString())
            .lte("contact_date", end.toISOString())
            .order("contact_date", { ascending: false });

        if (methodFilter !== "tutti") {
            query = query.eq("contact_method", methodFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching daily report:", error);
            setRows([]);
        } else {
            setRows((data as ContactHistoryRow[]) || []);
        }
        setLoading(false);
    }, [methodFilter, selectedDate, supabase]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDailyReport();
    }, [fetchDailyReport]);

    const summary = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                acc.total += 1;
                acc.byMethod[row.contact_method] = (acc.byMethod[row.contact_method] || 0) + 1;
                return acc;
            },
            { total: 0, byMethod: {} as Record<string, number> }
        );
    }, [rows]);

    return (
        <div className="glass-panel w-full overflow-hidden">
            <div className="flex flex-col items-start gap-4 border-b border-brand-border px-6 py-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-2 text-sm text-brand-muted">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Resoconto giornaliero</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2 text-xs text-brand-muted">
                        <Filter className="w-4 h-4" />
                        <span>Filtri</span>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition-colors focus:border-brand-accent focus:outline-none dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                    />
                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition-colors focus:border-brand-accent focus:outline-none dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                    >
                        {METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-brand-border px-6 py-4 text-sm text-brand-muted">
                <span className="text-brand-muted">Totale:</span>
                <span className="font-medium text-brand-text">{summary.total}</span>
                <span className="text-brand-muted">·</span>
                <span>Email: {summary.byMethod.email || 0}</span>
                <span className="text-brand-muted">·</span>
                <span>Telefono: {summary.byMethod.chiamata || 0}</span>
                <span className="text-brand-muted">·</span>
                <span>App/Messaggi: {summary.byMethod.messaggio || 0}</span>
                <span className="text-brand-muted">·</span>
                <span>Note: {summary.byMethod.nota || 0}</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-10 text-brand-muted">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento resoconto...
                </div>
            ) : rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-brand-muted">
                    Nessuna attività registrata per la data selezionata.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="surface-subtle border-b border-brand-border text-brand-muted">
                            <tr>
                                <th className="px-6 py-4 font-medium">Cliente</th>
                                <th className="px-6 py-4 font-medium">Tipo di contatto</th>
                                <th className="px-6 py-4 font-medium">Data/Ora</th>
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Telefono</th>
                                <th className="px-6 py-4 font-medium">Sito web</th>
                                <th className="px-6 py-4 font-medium">Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {rows.map((row) => (
                                <>
                                    <tr 
                                        key={row.id} 
                                        className={`cursor-pointer transition-colors hover:bg-brand-background/70 ${expandedRowId === row.id ? 'bg-brand-background/70' : ''}`}
                                        onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-brand-text">
                                                {row.saved_clients?.business_name || "Cliente"}
                                            </div>
                                            {(row.saved_clients?.city || row.saved_clients?.province) && (
                                                <div className="text-xs text-brand-muted">
                                                    {row.saved_clients?.city} {row.saved_clients?.province ? `(${row.saved_clients?.province})` : ""}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-brand-text">
                                                {getMethodIcon(row.contact_method)}
                                                <span>{getMethodLabel(row.contact_method)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-brand-muted">
                                            {format(new Date(row.contact_date), "d MMM yyyy, HH:mm", { locale: it })}
                                        </td>
                                        <td className="px-6 py-4 text-brand-muted">
                                            {row.saved_clients?.email ? (
                                                <a
                                                    href={`mailto:${row.saved_clients.email}`}
                                                    className="text-brand-accent hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {row.saved_clients.email}
                                                </a>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-brand-muted">
                                            {row.saved_clients?.phone ? (
                                                <a 
                                                    href={`tel:${row.saved_clients.phone}`} 
                                                    className="text-brand-accent hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {row.saved_clients.phone}
                                                </a>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-brand-muted">
                                            {row.saved_clients?.website ? (
                                                <a
                                                    href={row.saved_clients.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-brand-accent hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {row.saved_clients.website}
                                                </a>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-brand-muted">
                                            {row.notes ? (
                                                <div className="flex items-center gap-2 text-brand-accent font-medium">
                                                    <FileText className="w-3 h-3" />
                                                    <span>Dettagli</span>
                                                </div>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                    </tr>
                                    {expandedRowId === row.id && row.notes && (
                                        <tr className="bg-brand-background/60">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="rounded-lg border border-brand-border bg-brand-surface p-4 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                                                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Note dell'attività</div>
                                                    <div className="leading-relaxed whitespace-pre-wrap text-brand-text">
                                                        {row.notes}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
