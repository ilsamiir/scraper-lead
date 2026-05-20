"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, Mail, Send, TriangleAlert, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { EmailHistoryRow } from "@/lib/types";

type ClientSummary = {
    id: string;
    business_name?: string | null;
    city?: string | null;
    province?: string | null;
};

type EmailHistoryWithClient = EmailHistoryRow & {
    clientName: string;
    clientLocation: string;
};

const formatDateTime = (value: string) => format(new Date(value), "d MMM yyyy, HH:mm", { locale: it });

const sourceLabels: Record<EmailHistoryRow["source"], string> = {
    manual: "Manuale",
    cron: "Cron",
};

const statusLabels: Record<EmailHistoryRow["status"], string> = {
    sent: "Inviata",
    failed: "Fallita",
};

const statusClassNames: Record<EmailHistoryRow["status"], string> = {
    sent: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    failed: "border-red-300 bg-red-100 text-red-900 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300",
};

const buildClientLocation = (client?: ClientSummary) => {
    if (!client) return "Cliente non disponibile";
    const city = client.city?.trim();
    const province = client.province?.trim();

    if (city && province) return `${city} (${province})`;
    if (city) return city;
    if (province) return province;
    return "Posizione non disponibile";
};

export function EmailHistoryArchive() {
    const [supabase] = useState(() => createClient());
    const [history, setHistory] = useState<EmailHistoryWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const fetchArchive = async () => {
            setLoading(true);

            const { data: emailRows, error: emailError } = await supabase
                .from("email_history")
                .select("*")
                .order("sent_at", { ascending: false });

            if (!active) return;

            if (emailError) {
                console.error("Error fetching email archive:", emailError);
                setHistory([]);
                setSelectedEmailId(null);
                setLoading(false);
                return;
            }

            const typedEmailRows = (emailRows ?? []) as EmailHistoryRow[];
            const clientIds = Array.from(new Set(typedEmailRows.map((row) => row.client_id)));

            let clientsById = new Map<string, ClientSummary>();

            if (clientIds.length > 0) {
                const { data: clientRows, error: clientError } = await supabase
                    .from("saved_clients")
                    .select("id, business_name, city, province")
                    .in("id", clientIds);

                if (!active) return;

                if (clientError) {
                    console.error("Error fetching client summaries:", clientError);
                } else {
                    clientsById = new Map((clientRows as ClientSummary[]).map((client) => [client.id, client]));
                }
            }

            const nextHistory = typedEmailRows.map((row) => {
                const client = clientsById.get(row.client_id);
                return {
                    ...row,
                    clientName: client?.business_name?.trim() || "Cliente senza nome",
                    clientLocation: buildClientLocation(client),
                } satisfies EmailHistoryWithClient;
            });

            setHistory(nextHistory);
            setSelectedEmailId((previous) => (
                previous && nextHistory.some((item) => item.id === previous)
                    ? previous
                    : nextHistory[0]?.id ?? null
            ));
            setLoading(false);
        };

        void fetchArchive();

        return () => {
            active = false;
        };
    }, [supabase]);

    const selectedEmail = useMemo(
        () => history.find((item) => item.id === selectedEmailId) ?? history[0] ?? null,
        [history, selectedEmailId]
    );

    if (loading) {
        return (
            <div className="glass-panel flex items-center justify-center p-10 text-brand-muted">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento cronologia email...
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="glass-panel rounded-3xl border border-dashed border-brand-border p-10 text-center text-brand-muted">
                Nessuna email inviata finora.
            </div>
        );
    }

    return (
        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            <section className="glass-panel overflow-hidden p-0">
                <div className="border-b border-brand-border px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">Cronologia completa</p>
                    <h2 className="mt-1 text-lg font-semibold text-brand-text">Tutte le email inviate</h2>
                </div>
                <div className="max-h-[72vh] overflow-y-auto">
                    {history.map((item) => {
                        const isSelected = item.id === selectedEmail?.id;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedEmailId(item.id)}
                                className={`flex w-full flex-col gap-3 border-b border-brand-border px-5 py-4 text-left transition-colors last:border-b-0 ${isSelected ? "bg-brand-accent/10" : "hover:bg-brand-background/60 dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_88%,white_12%)]"}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClassNames[item.status]}`}>
                                        {item.status === "failed" ? <TriangleAlert className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                                        {statusLabels[item.status]}
                                    </span>
                                    <span className="text-xs text-brand-muted">{formatDateTime(item.sent_at)}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-brand-text">{item.clientName}</p>
                                    <p className="mt-1 truncate text-sm text-brand-muted">{item.subject}</p>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-xs text-brand-muted">
                                    <span className="truncate">{item.recipient_email}</span>
                                    <span>{sourceLabels[item.source]}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="glass-panel p-6">
                {selectedEmail ? (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">Dettaglio email</p>
                                <h3 className="mt-2 text-2xl font-semibold text-brand-text">{selectedEmail.subject}</h3>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClassNames[selectedEmail.status]}`}>
                                        {selectedEmail.status === "failed" ? <TriangleAlert className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                                        {statusLabels[selectedEmail.status]}
                                    </span>
                                    <span className="rounded-full border border-brand-border px-2 py-1 text-[11px] font-medium">{sourceLabels[selectedEmail.source]}</span>
                                    <span>{formatDateTime(selectedEmail.sent_at)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Cliente</p>
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand-text">
                                    <UserRound className="h-4 w-4 text-brand-accent" />
                                    {selectedEmail.clientName}
                                </p>
                                <p className="mt-1 text-sm text-brand-muted">{selectedEmail.clientLocation}</p>
                            </div>
                            <div className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Destinatario</p>
                                <p className="mt-2 break-all text-sm font-medium text-brand-text">{selectedEmail.recipient_email}</p>
                                <p className="mt-1 text-xs text-brand-muted">Message ID: {selectedEmail.provider_message_id || "-"}</p>
                            </div>
                        </div>

                        {selectedEmail.error_message ? (
                            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                                {selectedEmail.error_message}
                            </div>
                        ) : null}

                        <div className="rounded-3xl border border-brand-border bg-brand-surface dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                            <div className="border-b border-brand-border px-5 py-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Corpo inviato</p>
                            </div>
                            <pre className="max-h-[56vh] overflow-auto whitespace-pre-wrap px-5 py-5 font-sans text-sm leading-7 text-brand-text">
                                {selectedEmail.body}
                            </pre>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}