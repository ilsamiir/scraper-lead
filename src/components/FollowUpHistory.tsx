"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, Phone, Mail, FileText, Send, Calendar as CalendarIcon, Loader2, Pencil, Save, Trash2, X } from "lucide-react";

type ContactHistory = {
    id: string;
    contact_method: string;
    contact_date: string;
    notes?: string | null;
};

const formatContactDateTime = (value: string) => format(new Date(value), "d MMM yyyy, HH:mm", { locale: it });

const toDateTimeLocalValue = (value: string) => {
    const date = new Date(value);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

export function FollowUpHistory({ clientId }: { clientId: string }) {
    const [history, setHistory] = useState<ContactHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState({
        contact_method: "nota",
        contact_date: "",
        notes: "",
    });
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const supabase = createClient();

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contact_history')
            .select('*')
            .eq('client_id', clientId)
            .order('contact_date', { ascending: false });

        if (data) {
            const nextHistory = data as ContactHistory[];
            setHistory(nextHistory);
            setSelectedHistoryId((prev) => (
                prev && nextHistory.some((item) => item.id === prev)
                    ? prev
                    : nextHistory[0]?.id ?? null
            ));
            setEditingHistoryId((prev) => (
                prev && nextHistory.some((item) => item.id === prev)
                    ? prev
                    : null
            ));
        }
        if (error) console.error("Error fetching history:", error);
        setLoading(false);
    }, [clientId, supabase]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchHistory();
    }, [fetchHistory]);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        const newEntry = {
            client_id: clientId,
            contact_method: 'nota',
            notes: newNote,
            contact_date: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('contact_history')
            .insert([newEntry])
            .select();

        if (data && !error) {
            setHistory((prev) => [data[0] as ContactHistory, ...prev]);
            setNewNote("");
            setSelectedHistoryId((data[0] as ContactHistory).id);
            setEditingHistoryId(null);
        } else {
            alert("Errore salvataggio nota: " + error?.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Sei sicuro di voler eliminare questa azione dalla cronologia?")) return;

        setDeletingId(id);
        const { error } = await supabase
            .from('contact_history')
            .delete()
            .eq('id', id);

        if (!error) {
            setHistory((prev) => {
                const next = prev.filter((item) => item.id !== id);
                if (selectedHistoryId === id) {
                    setSelectedHistoryId(next[0]?.id ?? null);
                    setEditingHistoryId(null);
                }
                return next;
            });
        } else {
            console.error("Error deleting activity:", error);
            alert("Errore durante l'eliminazione: " + error.message);
        }
        setDeletingId(null);
    };

    const handleStartEdit = (activity: ContactHistory) => {
        setSelectedHistoryId(activity.id);
        setEditingHistoryId(activity.id);
        setEditDraft({
            contact_method: activity.contact_method,
            contact_date: toDateTimeLocalValue(activity.contact_date),
            notes: activity.notes ?? "",
        });
    };

    const handleCancelEdit = () => {
        setEditingHistoryId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingHistoryId) return;

        setSavingEdit(true);
        const payload = {
            contact_method: editDraft.contact_method,
            contact_date: new Date(editDraft.contact_date).toISOString(),
            notes: editDraft.notes.trim() || null,
        };

        const { error } = await supabase
            .from("contact_history")
            .update(payload)
            .eq("id", editingHistoryId);

        if (error) {
            console.error("Error updating activity:", error);
            alert("Errore durante il salvataggio: " + error.message);
            setSavingEdit(false);
            return;
        }

        setHistory((prev) => prev.map((item) => (
            item.id === editingHistoryId
                ? { ...item, ...payload }
                : item
        )));
        setSavingEdit(false);
        setEditingHistoryId(null);
    };

    const getIconForMethod = (method: string) => {
        switch (method.toLowerCase()) {
            case 'chiamata': return <Phone className="w-4 h-4 text-blue-400" />;
            case 'email': return <Mail className="w-4 h-4 text-brand-accent" />;
            case 'messaggio': return <Send className="w-4 h-4 text-green-400" />;
            case 'nota': return <FileText className="w-4 h-4 text-purple-400" />;
            default: return <CalendarIcon className="w-4 h-4 text-brand-muted" />;
        }
    };

    const selectedActivity = history.find((item) => item.id === selectedHistoryId) ?? null;
    const isEditingSelectedActivity = selectedActivity?.id === editingHistoryId;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6 text-brand-muted">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento storico...
            </div>
        );
    }

    return (
        <div className="surface-subtle space-y-6 rounded-xl border-t border-brand-border p-6 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_90%,black_10%)]">
            <h4 className="text-sm font-semibold text-brand-text">Storico Contatti & Note</h4>

            {/* Aggiungi Nota Rapida */}
            <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Aggiungi una nota o un riepilogo..."
                    className="flex-1 rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-sm text-brand-text transition-colors focus:border-brand-accent focus:outline-none dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                />
                <button
                    type="submit"
                    disabled={!newNote.trim()}
                    className="bg-brand-accent text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" /> Salva Nota
                </button>
            </form>

            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">Dettaglio attività</p>
                        <h5 className="mt-1 text-sm font-semibold text-brand-text">
                            {selectedActivity ? selectedActivity.contact_method : "Seleziona un'attività"}
                        </h5>
                    </div>

                    {selectedActivity ? (
                        <div className="flex items-center gap-2">
                            {!isEditingSelectedActivity ? (
                                <button
                                    type="button"
                                    onClick={() => handleStartEdit(selectedActivity)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-xs font-medium text-brand-text hover:bg-brand-background dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_88%,white_12%)]"
                                >
                                    <Pencil className="h-3.5 w-3.5" /> Modifica
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-xs font-medium text-brand-text hover:bg-brand-background dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_88%,white_12%)]"
                                    >
                                        <X className="h-3.5 w-3.5" /> Annulla
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveEdit}
                                        disabled={savingEdit || !editDraft.contact_date}
                                        className="inline-flex items-center gap-1 rounded-lg bg-brand-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                        {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salva
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => handleDelete(selectedActivity.id)}
                                disabled={deletingId === selectedActivity.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                            >
                                {deletingId === selectedActivity.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Elimina
                            </button>
                        </div>
                    ) : null}
                </div>

                {selectedActivity ? (
                    isEditingSelectedActivity ? (
                        <div className="mt-4 grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1 text-xs text-brand-muted">
                                    Metodo contatto
                                    <select
                                        value={editDraft.contact_method}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, contact_method: e.target.value }))}
                                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:border-brand-accent/60 focus:outline-none dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    >
                                        <option value="chiamata">Chiamata</option>
                                        <option value="email">Email</option>
                                        <option value="messaggio">Messaggio</option>
                                        <option value="nota">Nota</option>
                                    </select>
                                </label>
                                <label className="grid gap-1 text-xs text-brand-muted">
                                    Data e ora
                                    <input
                                        type="datetime-local"
                                        value={editDraft.contact_date}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, contact_date: e.target.value }))}
                                        className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:border-brand-accent/60 focus:outline-none dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    />
                                </label>
                            </div>
                            <label className="grid gap-1 text-xs text-brand-muted">
                                Note complete
                                <textarea
                                    value={editDraft.notes}
                                    onChange={(e) => setEditDraft((prev) => ({ ...prev, notes: e.target.value }))}
                                    rows={4}
                                    className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:border-brand-accent/60 focus:outline-none dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-3 text-sm text-brand-text">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-brand-border px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Metodo</p>
                                    <p className="mt-1 font-medium capitalize">{selectedActivity.contact_method}</p>
                                </div>
                                <div className="rounded-lg border border-brand-border px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Data e ora</p>
                                    <p className="mt-1 font-medium">{formatContactDateTime(selectedActivity.contact_date)}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-brand-border px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Note complete</p>
                                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                                    {selectedActivity.notes || "Nessuna nota disponibile per questa attività."}
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    <p className="mt-3 text-sm text-brand-muted">
                        Seleziona un&apos;attività dallo storico per visualizzare i dettagli completi.
                    </p>
                )}
            </div>

            {/* Timeline Storico */}
            <div className="space-y-4">
                {history.length === 0 ? (
                    <div className="text-sm text-brand-muted text-center py-4 italic">
                        Nessun evento registrato per questo cliente.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((log) => (
                            <div key={log.id} className="relative pl-6">
                                {/* Timeline Dot / Icon */}
                                <div className="absolute -left-3.5 top-0.5 z-10 rounded-full border border-brand-border bg-brand-surface p-1.5 shadow-[0_6px_18px_rgba(15,23,42,0.08)] dark:bg-[#0F1220] dark:shadow-none">
                                    {getIconForMethod(log.contact_method)}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedHistoryId(log.id);
                                        setEditingHistoryId(null);
                                    }}
                                    className={`group w-full rounded-lg border bg-brand-surface p-4 text-left transition-all dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)] ${selectedHistoryId === log.id ? "border-brand-accent/50 bg-brand-accent/10 shadow-[0_10px_24px_rgba(109,40,217,0.08)]" : "border-brand-border hover:border-brand-accent/30"}`}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium capitalize text-brand-text">
                                                {log.contact_method}
                                            </span>
                                            <span className="text-xs text-brand-muted">
                                                {formatContactDateTime(log.contact_date)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(log.id);
                                            }}
                                            disabled={deletingId === log.id}
                                            className="rounded-md p-1.5 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                                            title="Elimina attività"
                                        >
                                            {deletingId === log.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                    {log.notes && (
                                        <p className="line-clamp-2 text-sm leading-relaxed whitespace-pre-wrap text-brand-text">
                                            {log.notes}
                                        </p>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
