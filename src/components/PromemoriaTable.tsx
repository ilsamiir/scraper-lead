"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Phone, Mail, Calendar as CalendarIcon, FileText, CheckCircle, ExternalLink, Save, History, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { FollowUpHistory } from "@/components/FollowUpHistory";

type SavedClient = {
    id: string;
    business_name?: string | null;
    city?: string | null;
    province?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    google_maps_url?: string | null;
    email?: string | null;
    last_contact_method?: string | null;
    last_contact_date?: string | null;
    follow_up_date?: string | null;
    notes?: string | null;
    created_at?: string | null;
};

export function PromemoriaTable() {
    const [clients, setClients] = useState<SavedClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
    const [emailValue, setEmailValue] = useState("");
    const [editingLastContactId, setEditingLastContactId] = useState<string | null>(null);
    const [lastContactDateValue, setLastContactDateValue] = useState("");
    const [lastContactMethodValue, setLastContactMethodValue] = useState("chiamata");
    const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const supabase = createClient();

    const fetchClients = useCallback(async () => {
        setLoading(true);
        // Get today's date in YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('saved_clients')
            .select('*')
            .not('follow_up_date', 'is', null)
            .lte('follow_up_date', today)
            .order('follow_up_date', { ascending: true });

        if (data) setClients(data as SavedClient[]);
        if (error) console.error(error);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchClients();
    }, [fetchClients]);

    const handleEmailEdit = (client: SavedClient) => {
        setEditingEmailId(client.id);
        setEmailValue(client.email || "");
    };

    const handleLastContactEdit = (client: SavedClient) => {
        setEditingLastContactId(client.id);
        setLastContactDateValue(client.last_contact_date ? new Date(client.last_contact_date).toISOString().slice(0, 16) : "");
        setLastContactMethodValue(client.last_contact_method || "chiamata");
    };

    const saveLastContact = async (id: string) => {
        const newDate = lastContactDateValue ? new Date(lastContactDateValue).toISOString() : null;

        const { error } = await supabase
            .from('saved_clients')
            .update({
                last_contact_date: newDate,
                last_contact_method: lastContactMethodValue
            })
            .eq('id', id);

        if (!error) {
            setClients(clients.map(c => c.id === id ? {
                ...c,
                last_contact_date: newDate,
                last_contact_method: lastContactMethodValue
            } : c));

            // Log History automatically if date is set
            if (newDate) {
                await supabase.from('contact_history').insert([{
                    client_id: id,
                    contact_method: lastContactMethodValue,
                    contact_date: newDate,
                    notes: "Modifica manuale data/modello."
                }]);
            }
        } else {
            alert("Errore salvataggio ultimo contatto");
        }
        setEditingLastContactId(null);
    };

    const saveEmail = async (id: string) => {
        const { error } = await supabase
            .from('saved_clients')
            .update({ email: emailValue })
            .eq('id', id);

        if (!error) {
            setClients(clients.map(c => c.id === id ? { ...c, email: emailValue } : c));
        } else {
            alert("Errore salvataggio email");
        }
        setEditingEmailId(null);
    };

    const updateAction = async (id: string, updates: Partial<SavedClient>) => {
        const { error } = await supabase
            .from('saved_clients')
            .update(updates)
            .eq('id', id);

        if (!error) {
            // Remove from list if follow_up_date is pushed to future
            if (updates.follow_up_date) {
                const today = new Date().toISOString().split('T')[0];
                if (updates.follow_up_date > today) {
                    setClients(clients.filter(c => c.id !== id));
                    return;
                }
            } else if (updates.follow_up_date === null) { // If follow_up_date is set to null, remove from list
                setClients(clients.filter(c => c.id !== id));
                return;
            }
            setClients(clients.map(c => c.id === id ? { ...c, ...updates } : c));
        } else {
            alert("Errore aggiornamento: " + error.message);
        }
    };

    const handleCall = async (id: string) => {
        const now = new Date().toISOString();
        updateAction(id, { last_contact_method: 'chiamata', last_contact_date: now });
        await supabase.from('contact_history').insert([{ client_id: id, contact_method: 'chiamata', contact_date: now }]);
    };

    const handleMail = async (id: string) => {
        const now = new Date().toISOString();
        updateAction(id, { last_contact_method: 'email', last_contact_date: now });
        await supabase.from('contact_history').insert([{ client_id: id, contact_method: 'email', contact_date: now }]);
    };

    const handleNotes = async (client: SavedClient) => {
        const note = prompt("Inserisci note per " + client.business_name + ":", client.notes || "");
        if (note !== null) {
            updateAction(client.id, { notes: note });
            await supabase.from('contact_history').insert([{ client_id: client.id, contact_method: 'nota', contact_date: new Date().toISOString(), notes: note }]);
        }
    };

    const handleFollowUp = async (client: SavedClient) => {
        const date = prompt("Inserisci nuova data di follow-up (YYYY-MM-DD):", client.follow_up_date || "");
        if (date !== null) {
            if (date === "" || /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                updateAction(client.id, { follow_up_date: date === "" ? null : date });
            } else {
                alert("Formato data non valido. Usa YYYY-MM-DD.");
            }
        }
    };

    const handleComplete = async (id: string) => {
        if (confirm("Sei sicuro di voler rimuovere questo cliente dai promemoria? Verrà impostato 'follow_up_date' a NULL.")) {
            updateAction(id, { follow_up_date: null });
            await supabase.from('contact_history').insert([{ client_id: id, contact_method: 'completato', contact_date: new Date().toISOString(), notes: "Promemoria completato." }]);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedClients(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedClients.length === clients.length) {
            setSelectedClients([]);
        } else {
            setSelectedClients(clients.map(c => c.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`Sei sicuro di voler eliminare ${selectedClients.length} promemoria selezionati?`)) return;

        const { error } = await supabase
            .from('saved_clients')
            .delete()
            .in('id', selectedClients);

        if (!error) {
            setClients(clients.filter(c => !selectedClients.includes(c.id)));
            setSelectedClients([]);
        } else {
            alert("Errore durante l'eliminazione: " + error.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-brand-muted">Caricamento promemoria...</div>;

    if (clients.length === 0) {
        return (
            <div className="w-full glass-panel p-8 min-h-[400px] flex flex-col items-center justify-center text-center border-dashed">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                    <CalendarIcon className="w-8 h-8 text-brand-muted" />
                </div>
                <h3 className="text-xl font-medium text-brand-text">Nessun promemoria in sospeso</h3>
                <p className="mt-2 max-w-sm text-brand-muted">
                    Ottimo lavoro! Non hai follow-up in ritardo o programmati per oggi.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full glass-panel overflow-hidden">
            {selectedClients.length > 0 && (
                <div className="bg-brand-gradient-1/10 border-b border-brand-gradient-1/20 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-text">
                        {selectedClients.length} selezionat{selectedClients.length === 1 ? 'o' : 'i'}
                    </span>
                    <button
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition-colors text-sm font-medium border border-red-500/20"
                    >
                        <Trash2 className="w-4 h-4" />
                        Elimina Selezionati
                    </button>
                </div>
            )}
            <div className="overflow-x-auto min-h-[500px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="surface-subtle border-b border-brand-border text-brand-muted">
                        <tr>
                            <th className="px-6 py-4 font-medium w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedClients.length === clients.length && clients.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-white/20 bg-black/50 text-brand-accent focus:ring-brand-accent focus:ring-offset-black"
                                />
                            </th>
                            <th className="px-6 py-4 font-medium">Nome Azienda</th>
                            <th className="px-6 py-4 font-medium">Contatti</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Ultimo Contatto</th>
                            <th className="px-6 py-4 font-medium">Follow-up</th>
                            <th className="px-6 py-4 font-medium">Azioni Rapide</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {clients.map((client) => (
                            <Fragment key={client.id}>
                                <tr className={`border-l-2 border-brand-accent transition-colors hover:bg-brand-background/70 ${selectedClients.includes(client.id) ? 'bg-brand-gradient-1/5' : 'bg-transparent'}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedClients.includes(client.id)}
                                            onChange={() => toggleSelect(client.id)}
                                            className="rounded border-brand-border bg-brand-surface text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-background dark:bg-[#0F1220]"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-brand-text">{client.business_name}</div>
                                        <div className="text-xs text-brand-muted">{client.city} {client.province ? `(${client.province})` : ''}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-brand-text">{client.phone || '-'}</div>
                                        <div className="flex gap-2 text-xs mt-1">
                                            {client.website && <a href={client.website} target="_blank" className="text-brand-gradient-1 hover:underline flex items-center gap-1">Web <ExternalLink className="w-3 h-3" /></a>}
                                            {client.google_maps_url && <a href={client.google_maps_url} target="_blank" className="text-brand-accent hover:underline flex items-center gap-1">Maps <ExternalLink className="w-3 h-3" /></a>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingEmailId === client.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    type="email"
                                                    value={emailValue}
                                                    onChange={(e) => setEmailValue(e.target.value)}
                                                    className="w-48 rounded border border-brand-border bg-brand-surface px-2 py-1 text-sm text-brand-text focus:border-brand-accent focus:outline-none dark:bg-[#0F1220]"
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEmail(client.id)}
                                                />
                                                <button onClick={() => saveEmail(client.id)} className="text-green-400 hover:text-green-300"><Save className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => handleEmailEdit(client)}
                                                className="group flex cursor-pointer items-center gap-2 border-b border-transparent py-1 transition-colors hover:border-brand-border"
                                                title="Clicca per modificare"
                                            >
                                                <span className={client.email ? "text-brand-text" : "italic text-brand-muted"}>
                                                    {client.email || 'Inserisci email...'}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingLastContactId === client.id ? (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="datetime-local"
                                                    value={lastContactDateValue}
                                                    onChange={(e) => setLastContactDateValue(e.target.value)}
                                                    className="w-full rounded border border-brand-border bg-brand-surface px-2 py-1 text-sm text-brand-text focus:border-brand-accent focus:outline-none dark:bg-[#0F1220]"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={lastContactMethodValue}
                                                        onChange={(e) => setLastContactMethodValue(e.target.value)}
                                                        className="w-full rounded border border-brand-border bg-brand-surface px-2 py-1 text-sm text-brand-text focus:border-brand-accent focus:outline-none dark:bg-[#0F1220]"
                                                    >
                                                        <option value="chiamata">Chiamata</option>
                                                        <option value="email">Email</option>
                                                        <option value="messaggio">Messaggio</option>
                                                        <option value="altro">Altro</option>
                                                    </select>
                                                    <button onClick={() => saveLastContact(client.id)} className="text-green-400 hover:text-green-300"><Save className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => handleLastContactEdit(client)}
                                                className="group flex cursor-pointer items-center gap-2 border-b border-transparent py-1 transition-colors hover:border-brand-border"
                                                title="Clicca per modificare data e tipo contatto"
                                            >
                                                {client.last_contact_date ? (
                                                    <div className="flex items-center gap-2 text-brand-text">
                                                        {client.last_contact_method === 'chiamata' ? <Phone className="w-3 h-3 text-blue-400" /> :
                                                            client.last_contact_method === 'email' ? <Mail className="w-3 h-3 text-brand-accent" /> :
                                                                <FileText className="w-3 h-3 text-brand-muted" />}
                                                        {new Date(client.last_contact_date).toLocaleDateString('it-IT')}
                                                    </div>
                                                ) : (
                                                    <span className="italic text-brand-muted">Aggiungi contatto...</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 font-medium">
                                            {client.follow_up_date
                                                ? new Date(client.follow_up_date).toLocaleDateString('it-IT')
                                                : "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleCall(client.id)} className="p-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Registra Chiamata">
                                                <Phone className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleMail(client.id)} className="p-1.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors" title="Registra Email">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleFollowUp(client)} className="p-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors" title="Riposponi Follow-up">
                                                <CalendarIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleNotes(client)} className="relative rounded-md bg-brand-surface p-1.5 text-brand-muted transition-colors hover:bg-brand-background dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)] dark:hover:bg-brand-surface" title="Aggiungi Note">
                                                <FileText className="w-4 h-4" />
                                                {client.notes && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full"></span>}
                                            </button>
                                            <button onClick={() => handleComplete(client.id)} className="p-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors" title="Rimuovi da Promemoria">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setExpandedClientId(expandedClientId === client.id ? null : client.id)}
                                                className="ml-2 p-1.5 rounded-md bg-brand-gradient-1/10 hover:bg-brand-gradient-1/20 text-brand-gradient-1 transition-colors flex items-center gap-1"
                                                title="Vedi Storico"
                                            >
                                                <History className="w-4 h-4" />
                                                {expandedClientId === client.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedClientId === client.id && (
                                    <tr key={`history-${client.id}`} className="bg-brand-background/50">
                                        <td colSpan={7} className="border-b border-brand-border p-0">
                                            <FollowUpHistory clientId={client.id} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
