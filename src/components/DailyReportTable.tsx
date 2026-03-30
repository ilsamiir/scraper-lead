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
            return <CalendarIcon className="w-4 h-4 text-white/50" />;
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
    const supabase = createClient();

    const fetchDailyReport = useCallback(async () => {
        setLoading(true);
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
        <div className="w-full glass-panel overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Resoconto giornaliero</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <Filter className="w-4 h-4" />
                        <span>Filtri</span>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                    />
                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                    >
                        {METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center gap-3 text-sm text-white/70">
                <span className="text-white/40">Totale:</span>
                <span className="font-medium text-white">{summary.total}</span>
                <span className="text-white/40">·</span>
                <span>Email: {summary.byMethod.email || 0}</span>
                <span className="text-white/40">·</span>
                <span>Telefono: {summary.byMethod.chiamata || 0}</span>
                <span className="text-white/40">·</span>
                <span>App/Messaggi: {summary.byMethod.messaggio || 0}</span>
                <span className="text-white/40">·</span>
                <span>Note: {summary.byMethod.nota || 0}</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-10 text-white/50">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento resoconto...
                </div>
            ) : rows.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-sm">
                    Nessuna attività registrata per la data selezionata.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white/5 border-b border-white/10 text-white/60">
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
                        <tbody className="divide-y divide-white/10">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">
                                            {row.saved_clients?.business_name || "Cliente"}
                                        </div>
                                        {(row.saved_clients?.city || row.saved_clients?.province) && (
                                            <div className="text-xs text-white/50">
                                                {row.saved_clients?.city} {row.saved_clients?.province ? `(${row.saved_clients?.province})` : ""}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-white/80">
                                            {getMethodIcon(row.contact_method)}
                                            <span>{getMethodLabel(row.contact_method)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-white/70">
                                        {format(new Date(row.contact_date), "d MMM yyyy, HH:mm", { locale: it })}
                                    </td>
                                    <td className="px-6 py-4 text-white/70">
                                        {row.saved_clients?.email ? (
                                            <a
                                                href={`mailto:${row.saved_clients.email}`}
                                                className="text-brand-accent hover:underline"
                                            >
                                                {row.saved_clients.email}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-white/70">
                                        {row.saved_clients?.phone ? (
                                            <a href={`tel:${row.saved_clients.phone}`} className="text-brand-accent hover:underline">
                                                {row.saved_clients.phone}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-white/70">
                                        {row.saved_clients?.website ? (
                                            <a
                                                href={row.saved_clients.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-accent hover:underline"
                                            >
                                                {row.saved_clients.website}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-white/60 whitespace-pre-wrap">
                                        {row.notes || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
