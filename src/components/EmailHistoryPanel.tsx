"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronDown, ChevronUp, Loader2, Mail, TriangleAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { EmailHistoryRow } from "@/lib/types";

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

export function EmailHistoryPanel({ clientId, refreshToken = 0 }: { clientId: string; refreshToken?: number }) {
    const [supabase] = useState(() => createClient());
    const [history, setHistory] = useState<EmailHistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("email_history")
            .select("*")
            .eq("client_id", clientId)
            .order("sent_at", { ascending: false });

        if (error) {
            console.error("Error fetching email history:", error);
            setHistory([]);
            setExpandedId(null);
            setLoading(false);
            return;
        }

        const nextHistory = (data ?? []) as EmailHistoryRow[];
        setHistory(nextHistory);
        setExpandedId((previous) => (
            previous && nextHistory.some((item) => item.id === previous)
                ? previous
                : nextHistory[0]?.id ?? null
        ));
        setLoading(false);
    }, [clientId, supabase]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchHistory();
    }, [fetchHistory, refreshToken]);

    return (
        <section className="surface-subtle space-y-4 rounded-xl border border-brand-border p-5 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_90%,black_10%)]">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">Posta</p>
                    <h4 className="mt-1 text-sm font-semibold text-brand-text">Email inviate</h4>
                </div>
                <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-brand-border px-2 py-1 text-xs font-medium text-brand-muted">
                    {history.length}
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6 text-sm text-brand-muted">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento posta...
                </div>
            ) : history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brand-border px-4 py-5 text-sm text-brand-muted">
                    Nessuna email inviata per questo cliente.
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map((item) => {
                        const isExpanded = expandedId === item.id;

                        return (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                    className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left hover:bg-brand-background/60 dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_88%,white_12%)]"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClassNames[item.status]}`}>
                                                {item.status === "failed" ? <TriangleAlert className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                                                {statusLabels[item.status]}
                                            </span>
                                            <span className="rounded-full border border-brand-border px-2 py-1 text-[11px] font-medium text-brand-muted">
                                                {sourceLabels[item.source]}
                                            </span>
                                            <span className="text-xs text-brand-muted">{formatDateTime(item.sent_at)}</span>
                                        </div>
                                        <h5 className="mt-2 truncate text-sm font-semibold text-brand-text">{item.subject}</h5>
                                        <p className="mt-1 text-xs text-brand-muted">A: {item.recipient_email}</p>
                                    </div>
                                    {isExpanded ? <ChevronUp className="mt-1 h-4 w-4 text-brand-muted" /> : <ChevronDown className="mt-1 h-4 w-4 text-brand-muted" />}
                                </button>

                                {isExpanded ? (
                                    <div className="border-t border-brand-border px-4 py-4 text-sm text-brand-text">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Destinatario</p>
                                                <p className="mt-1 break-all">{item.recipient_email}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Message ID</p>
                                                <p className="mt-1 break-all text-brand-muted">{item.provider_message_id || "-"}</p>
                                            </div>
                                        </div>

                                        {item.error_message ? (
                                            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                                                {item.error_message}
                                            </div>
                                        ) : null}

                                        <div className="mt-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Corpo email</p>
                                            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-background/70 px-3 py-3 font-sans text-sm text-brand-text dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_84%,white_16%)]">
                                                {item.body}
                                            </pre>
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}