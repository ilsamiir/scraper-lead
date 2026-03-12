"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Phone, Mail, Calendar as CalendarIcon, FileText, ExternalLink, Save, History, ChevronDown, ChevronUp, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { FollowUpHistory } from "@/components/FollowUpHistory";

type SavedClient = {
    id: string;
    business_name?: string | null;
    city?: string | null;
    province?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    email?: string | null;
    last_contact_method?: string | null;
    last_contact_date?: string | null;
    follow_up_date?: string | null;
    notes?: string | null;
    google_maps_url?: string | null;
    created_at?: string | null;
};

export function SavedClientsTable() {
    const [clients, setClients] = useState<SavedClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
    const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
    const [emailValue, setEmailValue] = useState("");
    const [editingLastContactId, setEditingLastContactId] = useState<string | null>(null);
    const [lastContactDateValue, setLastContactDateValue] = useState("");
    const [lastContactMethodValue, setLastContactMethodValue] = useState("chiamata");
    const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const fetchClients = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('saved_clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            const clientRows = data as SavedClient[];
            setClients(clientRows);

            const ids = clientRows.map((client) => client.id).filter(Boolean);
            if (ids.length > 0) {
                const { data: historyRows } = await supabase
                    .from('contact_history')
                    .select('client_id')
                    .in('client_id', ids);

                const counts = (historyRows || []).reduce<Record<string, number>>((acc, row) => {
                    const key = row.client_id as string;
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                }, {});
                setContactCounts(counts);
            } else {
                setContactCounts({});
            }
        }
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
                setContactCounts((prev) => ({
                    ...prev,
                    [id]: (prev[id] ?? 0) + 1
                }));
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
            setClients(clients.map(c => c.id === id ? { ...c, ...updates } : c));
        } else {
            alert("Errore aggiornamento: " + error.message);
        }
    };

    const handleCall = async (id: string) => {
        const now = new Date().toISOString();
        updateAction(id, { last_contact_method: 'chiamata', last_contact_date: now });
        await supabase.from('contact_history').insert([{ client_id: id, contact_method: 'chiamata', contact_date: now }]);
        setContactCounts((prev) => ({
            ...prev,
            [id]: (prev[id] ?? 0) + 1
        }));
    };

    const handleMail = async (id: string) => {
        const now = new Date().toISOString();
        updateAction(id, { last_contact_method: 'email', last_contact_date: now });
        await supabase.from('contact_history').insert([{ client_id: id, contact_method: 'email', contact_date: now }]);
        setContactCounts((prev) => ({
            ...prev,
            [id]: (prev[id] ?? 0) + 1
        }));
    };

    const handleNotes = async (client: SavedClient) => {
        const note = prompt("Inserisci note per " + client.business_name + ":", client.notes || "");
        if (note !== null) {
            updateAction(client.id, { notes: note });
            await supabase.from('contact_history').insert([{ client_id: client.id, contact_method: 'nota', contact_date: new Date().toISOString(), notes: note }]);
            setContactCounts((prev) => ({
                ...prev,
                [client.id]: (prev[client.id] ?? 0) + 1
            }));
        }
    };

    const handleFollowUp = async (client: SavedClient) => {
        const date = prompt("Inserisci data di follow-up (YYYY-MM-DD):", client.follow_up_date || "");
        if (date !== null) {
            // Basic validation
            if (date === "" || /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                updateAction(client.id, { follow_up_date: date === "" ? null : date });
            } else {
                alert("Formato data non valido. Usa YYYY-MM-DD.");
            }
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedClients(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedClients.length === filteredClients.length) {
            setSelectedClients([]);
        } else {
            setSelectedClients(filteredClients.map(c => c.id));
        }
    };

    const filteredClients = clients.filter(c => {
        const q = searchQuery.toLowerCase();
        return (
            (c.business_name || "").toLowerCase().includes(q) ||
            (c.city || "").toLowerCase().includes(q) ||
            (c.phone || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)
        );
    });

    const scrollLeft = () => {
        scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
    };

    const scrollRight = () => {
        scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`Sei sicuro di voler eliminare ${selectedClients.length} clienti selezionati?`)) return;

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

    if (loading) return <div className="text-center p-8 text-white/50">Caricamento clienti...</div>;

    if (clients.length === 0) {
        return (
            <div className="w-full glass-panel p-8 min-h-[400px] flex flex-col items-center justify-center text-center border-dashed">
                <h3 className="text-xl font-medium text-white/80">Nessun cliente salvato</h3>
                <p className="text-white/40 mt-2 max-w-sm">
                    Torna alla ricerca per estrarre e salvare i tuoi lead nel CRM.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full glass-panel overflow-hidden">
            {/* Toolbar: ricerca + azioni */}
            <div className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Cerca per nome, città, telefono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-accent/60 focus:bg-white/8 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <span className="text-xs text-white/30 ml-auto">
                    {filteredClients.length} / {clients.length} clienti
                </span>
            </div>

            {selectedClients.length > 0 && (
                <div className="bg-brand-gradient-1/10 border-b border-brand-gradient-1/20 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-white/90">
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

            {/* Slider con frecce */}
            <div className="relative">
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-0 z-10 h-full px-2 flex items-center bg-gradient-to-r from-black/40 to-transparent text-white/40 hover:text-white/80 transition-colors"
                    aria-label="Scorri a sinistra"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-0 z-10 h-full px-2 flex items-center bg-gradient-to-l from-black/40 to-transparent text-white/40 hover:text-white/80 transition-colors"
                    aria-label="Scorri a destra"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                <div ref={scrollRef} className="overflow-x-auto min-h-[500px] scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white/5 border-b border-white/10 text-white/60">
                            <tr>
                                <th className="px-6 py-4 font-medium w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-white/20 bg-black/50 text-brand-accent focus:ring-brand-accent focus:ring-offset-black"
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium">Nome Azienda</th>
                                <th className="px-6 py-4 font-medium">Contatti</th>
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Ultimo Contatto</th>
                                <th className="px-6 py-4 font-medium">Contatti</th>
                                <th className="px-6 py-4 font-medium">Follow-up</th>
                                <th className="px-6 py-4 font-medium">Azioni Rapide</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-white/30 text-sm">
                                        Nessun cliente trovato per &quot;{searchQuery}&quot;
                                    </td>
                                </tr>
                            ) : filteredClients.map((client) => (
                                <Fragment key={client.id}>
                                    <tr className={`hover:bg-white/[0.02] transition-colors ${selectedClients.includes(client.id) ? 'bg-brand-gradient-1/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedClients.includes(client.id)}
                                                onChange={() => toggleSelect(client.id)}
                                                className="rounded border-white/20 bg-black/50 text-brand-accent focus:ring-brand-accent focus:ring-offset-black"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{client.business_name}</div>
                                            <div className="text-xs text-white/50">{client.city} {client.province ? `(${client.province})` : ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white/80">{client.phone || '-'}</div>
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
                                                        className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-accent w-48"
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEmail(client.id)}
                                                    />
                                                    <button onClick={() => saveEmail(client.id)} className="text-green-400 hover:text-green-300"><Save className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => handleEmailEdit(client)}
                                                    className="group flex items-center gap-2 cursor-pointer border-b border-transparent hover:border-white/30 transition-colors py-1"
                                                    title="Clicca per modificare"
                                                >
                                                    <span className={client.email ? "text-white/90" : "text-white/30 italic"}>
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
                                                        className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-accent w-full"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={lastContactMethodValue}
                                                            onChange={(e) => setLastContactMethodValue(e.target.value)}
                                                            className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-accent w-full"
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
                                                    className="group flex items-center gap-2 cursor-pointer border-b border-transparent hover:border-white/30 transition-colors py-1"
                                                    title="Clicca per modificare data e tipo contatto"
                                                >
                                                    {client.last_contact_date ? (
                                                        <div className="flex items-center gap-2 text-white/80">
                                                            {client.last_contact_method === 'chiamata' ? <Phone className="w-3 h-3 text-blue-400" /> :
                                                                client.last_contact_method === 'email' ? <Mail className="w-3 h-3 text-brand-accent" /> :
                                                                    <FileText className="w-3 h-3 text-white/50" />}
                                                            {new Date(client.last_contact_date).toLocaleDateString('it-IT')}
                                                        </div>
                                                    ) : (
                                                        <span className="text-white/30 italic">Aggiungi contatto...</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {(contactCounts[client.id] ?? 0) === 0 && (
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                                                    </span>
                                                )}
                                                <span className="text-white/90 font-medium">
                                                    {contactCounts[client.id] ?? 0}
                                                </span>
                                                <span className="text-xs text-white/40">contatti</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs ${client.follow_up_date && new Date(client.follow_up_date) <= new Date() ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/70'}`}>
                                                {client.follow_up_date ? new Date(client.follow_up_date).toLocaleDateString('it-IT') : 'Nessuno'}
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
                                                <button onClick={() => handleFollowUp(client)} className="p-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors" title="Imposta Follow-up">
                                                    <CalendarIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleNotes(client)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 transition-colors relative" title="Aggiungi Note">
                                                    <FileText className="w-4 h-4" />
                                                    {client.notes && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full"></span>}
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
                                        <tr key={`history-${client.id}`} className="bg-white/[0.01]">
                                            <td colSpan={8} className="p-0 border-b border-white/5">
                                                <FollowUpHistory clientId={client.id} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>{/* end relative slider wrapper */}
        </div>
    );
}
