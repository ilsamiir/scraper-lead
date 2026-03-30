"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Phone, Mail, FileText, Send, Calendar as CalendarIcon, Loader2, Save } from "lucide-react";

type ContactHistory = {
    id: string;
    contact_method: string;
    contact_date: string;
    notes?: string | null;
};

type CollapsedHistory = ContactHistory & {
    repeatCount?: number;
};

export function FollowUpHistory({ clientId }: { clientId: string }) {
    const [history, setHistory] = useState<ContactHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState("");
    const supabase = createClient();

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contact_history')
            .select('*')
            .eq('client_id', clientId)
            .order('contact_date', { ascending: false });

        if (data) setHistory(data as ContactHistory[]);
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
        } else {
            alert("Errore salvataggio nota: " + error?.message);
        }
    };

    const getIconForMethod = (method: string) => {
        switch (method.toLowerCase()) {
            case 'chiamata': return <Phone className="w-4 h-4 text-blue-400" />;
            case 'email': return <Mail className="w-4 h-4 text-brand-accent" />;
            case 'messaggio': return <Send className="w-4 h-4 text-green-400" />;
            case 'nota': return <FileText className="w-4 h-4 text-purple-400" />;
            default: return <CalendarIcon className="w-4 h-4 text-white/50" />;
        }
    };

    const collapsedHistory = history.reduce<CollapsedHistory[]>((acc, log) => {
        const last = acc[acc.length - 1];
        const lastNotes = last?.notes ?? "";
        const currentNotes = log.notes ?? "";

        if (last && last.contact_method === log.contact_method && lastNotes === currentNotes) {
            last.repeatCount = (last.repeatCount ?? 1) + 1;
            return acc;
        }

        acc.push({ ...log });
        return acc;
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6 text-white/50">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento storico...
            </div>
        );
    }

    return (
        <div className="bg-black/40 border-t border-white/5 p-6 space-y-6">
            <h4 className="text-sm font-medium text-white/80">Storico Contatti & Note</h4>

            {/* Aggiungi Nota Rapida */}
            <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Aggiungi una nota o un riepilogo..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                />
                <button
                    type="submit"
                    disabled={!newNote.trim()}
                    className="bg-brand-accent text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" /> Salva Nota
                </button>
            </form>

            {/* Timeline Storico */}
            <div className="space-y-4">
                {history.length === 0 ? (
                    <div className="text-sm text-white/40 text-center py-4 italic">
                        Nessun evento registrato per questo cliente.
                    </div>
                ) : (
                    <div className="relative border-l border-white/10 ml-3 space-y-6 pb-2">
                        {collapsedHistory.map((log) => (
                            <div key={log.id} className="relative pl-6">
                                {/* Timeline Dot / Icon */}
                                <div className="absolute -left-3.5 top-0.5 bg-black border border-white/20 rounded-full p-1.5 z-10">
                                    {getIconForMethod(log.contact_method)}
                                </div>

                                {/* Content */}
                                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-white/90 capitalize flex items-center gap-2">
                                            {log.contact_method}
                                            {log.repeatCount && log.repeatCount > 1 && (
                                                <span className="text-[10px] font-semibold uppercase text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                                                    Ripetuto x{log.repeatCount}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {format(new Date(log.contact_date), "d MMM yyyy, HH:mm", { locale: it })}
                                        </span>
                                    </div>
                                    {log.notes && (
                                        <p className="text-sm text-white/70 whitespace-pre-wrap">
                                            {log.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
