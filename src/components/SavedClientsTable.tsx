"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    Calendar as CalendarIcon,
    ExternalLink,
    GripVertical,
    Mail,
    Phone,
    Plus,
    Save,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { AddClientActions } from "@/components/AddClientActions";
import { FollowUpHistory } from "@/components/FollowUpHistory";

type SavedClient = {
    id: string;
    business_name?: string | null;
    keyword?: string | null;
    city?: string | null;
    province?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    email?: string | null;
    last_contact_method?: string | null;
    last_contact_date?: string | null;
    follow_up_date?: string | null;
    status?: string | null;
    notes?: string | null;
    google_maps_url?: string | null;
    created_at?: string | null;
};

type BoardColumn = {
    id: string;
    title: string;
    colorClass: string;
};

const DEFAULT_COLUMNS: BoardColumn[] = [
    { id: "Da contattare", title: "Da contattare", colorClass: "bg-blue-500/15 text-blue-300 border-blue-400/30" },
    { id: "In lavorazione", title: "In lavorazione", colorClass: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
    { id: "Da richiamare", title: "Da richiamare", colorClass: "bg-purple-500/15 text-purple-300 border-purple-400/30" },
    { id: "Convertiti", title: "Convertiti", colorClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
];

const STORAGE_KEY = "lead-intelligence:clienti-columns:v1";

const sanitizeColumnName = (value: string) => value.trim().replace(/\s+/g, " ");

export function SavedClientsTable() {
    const supabase = createClient();

    const [clients, setClients] = useState<SavedClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
    const [columns, setColumns] = useState<BoardColumn[]>(DEFAULT_COLUMNS);
    const [newColumnName, setNewColumnName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
    const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
        // Funzione per riordinare le colonne
        const moveColumn = (fromId: string, toId: string) => {
            if (fromId === toId) return;
            const fromIdx = columns.findIndex((col) => col.id === fromId);
            const toIdx = columns.findIndex((col) => col.id === toId);
            if (fromIdx === -1 || toIdx === -1) return;
            const updated = [...columns];
            const [removed] = updated.splice(fromIdx, 1);
            updated.splice(toIdx, 0, removed);
            persistColumns(updated);
        };
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [savingDetails, setSavingDetails] = useState(false);

    const selectedClient = useMemo(
        () => clients.find((client) => client.id === selectedClientId) ?? null,
        [clients, selectedClientId]
    );

    const [detailDraft, setDetailDraft] = useState<{
        email: string;
        phone: string;
        website: string;
        follow_up_date: string;
        notes: string;
    }>({
        email: "",
        phone: "",
        website: "",
        follow_up_date: "",
        notes: "",
    });

    const fetchClients = useCallback(async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("saved_clients")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            setLoading(false);
            return;
        }

        const rows = (data ?? []) as SavedClient[];
        setClients(rows);

        const ids = rows.map((client) => client.id);
        if (ids.length > 0) {
            const { data: historyRows } = await supabase
                .from("contact_history")
                .select("client_id")
                .in("client_id", ids);

            const counts: Record<string, number> = {};
            (historyRows ?? []).forEach((row) => {
                counts[row.client_id] = (counts[row.client_id] ?? 0) + 1;
            });
            setContactCounts(counts);
        } else {
            setContactCounts({});
        }

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as BoardColumn[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                setColumns(parsed);
            }
        } catch {
            // ignore malformed local value
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        if (!selectedClient) return;

        setDetailDraft({
            email: selectedClient.email ?? "",
            phone: selectedClient.phone ?? "",
            website: selectedClient.website ?? "",
            follow_up_date: selectedClient.follow_up_date ?? "",
            notes: selectedClient.notes ?? "",
        });
    }, [selectedClient]);

    useEffect(() => {
        if (clients.length === 0) return;

        setColumns((previous) => {
            const knownIds = new Set(previous.map((col) => col.id));
            const missingStatuses = Array.from(
                new Set(
                    clients
                        .map((client) => sanitizeColumnName(client.status || ""))
                        .filter((status) => status.length > 0 && !knownIds.has(status))
                )
            );

            if (missingStatuses.length === 0) return previous;

            const appended: BoardColumn[] = missingStatuses.map((status) => ({
                id: status,
                title: status,
                colorClass: "bg-white/10 text-white border-white/20",
            }));

            const next = [...previous, ...appended];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, [clients]);

    const filteredClients = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return clients;

        return clients.filter((client) =>
            [
                client.business_name,
                client.keyword,
                client.city,
                client.province,
                client.phone,
                client.email,
                client.status,
            ]
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [clients, searchQuery]);

    const groupedClients = useMemo(() => {
        const defaultColumn = columns[0]?.id ?? "Da contattare";

        return columns.map((column) => ({
            ...column,
            clients: filteredClients.filter((client) => (client.status || defaultColumn) === column.id),
        }));
    }, [columns, filteredClients]);

    const persistColumns = (nextColumns: BoardColumn[]) => {
        setColumns(nextColumns);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextColumns));
    };

    const updateClient = async (id: string, updates: Partial<SavedClient>) => {
        const { error } = await supabase.from("saved_clients").update(updates).eq("id", id);

        if (error) {
            alert("Errore aggiornamento: " + error.message);
            return false;
        }

        setClients((prev) => prev.map((client) => (client.id === id ? { ...client, ...updates } : client)));
        return true;
    };

    const moveClientToColumn = async (clientId: string, targetColumnId: string) => {
        const current = clients.find((client) => client.id === clientId);
        if (!current || current.status === targetColumnId) return;

        await updateClient(clientId, { status: targetColumnId });
    };

    const handleDropOnColumn = async (columnId: string) => {
        if (!draggedClientId) return;
        await moveClientToColumn(draggedClientId, columnId);
        setDraggedClientId(null);
    };

    const handleAddColumn = () => {
        const label = sanitizeColumnName(newColumnName);
        if (!label) return;

        if (columns.some((column) => column.id.toLowerCase() === label.toLowerCase())) {
            alert("Esiste già una colonna con questo nome.");
            return;
        }

        const next = [
            ...columns,
            {
                id: label,
                title: label,
                colorClass: "bg-white/10 text-white border-white/20",
            },
        ];

        persistColumns(next);
        setNewColumnName("");
    };

    const handleRenameColumn = async (columnId: string) => {
        const current = columns.find((column) => column.id === columnId);
        if (!current) return;

        const proposed = prompt("Nuovo nome colonna:", current.title);
        if (proposed === null) return;

        const nextName = sanitizeColumnName(proposed);
        if (!nextName || nextName === columnId) return;

        if (columns.some((column) => column.id.toLowerCase() === nextName.toLowerCase())) {
            alert("Esiste già una colonna con questo nome.");
            return;
        }

        const { error } = await supabase
            .from("saved_clients")
            .update({ status: nextName })
            .eq("status", columnId);

        if (error) {
            alert("Errore rinomina colonna: " + error.message);
            return;
        }

        setClients((prev) =>
            prev.map((client) => (client.status === columnId ? { ...client, status: nextName } : client))
        );

        const nextColumns = columns.map((column) =>
            column.id === columnId ? { ...column, id: nextName, title: nextName } : column
        );

        persistColumns(nextColumns);
    };

    const handleDeleteColumn = async (columnId: string) => {
        if (columns.length <= 1) {
            alert("Deve rimanere almeno una colonna.");
            return;
        }

        const fallbackColumn = columns.find((column) => column.id !== columnId);
        if (!fallbackColumn) return;

        const clientsInColumn = clients.filter((client) => (client.status || columns[0].id) === columnId);

        if (
            !confirm(
                `Eliminare la colonna? ${clientsInColumn.length} nominativi saranno spostati in "${fallbackColumn.title}".`
            )
        ) {
            return;
        }

        if (clientsInColumn.length > 0) {
            const { error } = await supabase
                .from("saved_clients")
                .update({ status: fallbackColumn.id })
                .eq("status", columnId);

            if (error) {
                alert("Errore durante lo spostamento clienti: " + error.message);
                return;
            }

            setClients((prev) =>
                prev.map((client) =>
                    (client.status || columns[0].id) === columnId
                        ? { ...client, status: fallbackColumn.id }
                        : client
                )
            );
        }

        const next = columns.filter((column) => column.id !== columnId);
        persistColumns(next);

        if (selectedClient?.status === columnId) {
            setSelectedClientId(selectedClient.id);
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedClient) return;

        setSavingDetails(true);
        const ok = await updateClient(selectedClient.id, {
            email: detailDraft.email || null,
            phone: detailDraft.phone || null,
            website: detailDraft.website || null,
            follow_up_date: detailDraft.follow_up_date || null,
            notes: detailDraft.notes || null,
        });

        if (ok) {
            alert("Dettagli contatto salvati.");
        }
        setSavingDetails(false);
    };

    const logContact = async (method: "chiamata" | "email") => {
        if (!selectedClient) return;

        const now = new Date().toISOString();
        const ok = await updateClient(selectedClient.id, {
            last_contact_method: method,
            last_contact_date: now,
        });

        if (!ok) return;

        await supabase.from("contact_history").insert([
            {
                client_id: selectedClient.id,
                contact_method: method,
                contact_date: now,
                notes: method === "chiamata" ? "Chiamata registrata dal board clienti." : "Email registrata dal board clienti.",
            },
        ]);

        setContactCounts((prev) => ({
            ...prev,
            [selectedClient.id]: (prev[selectedClient.id] ?? 0) + 1,
        }));
    };

    const handleDeleteClient = async (id: string) => {
        if (!confirm("Vuoi eliminare definitivamente questo nominativo?")) return;

        const { error } = await supabase.from("saved_clients").delete().eq("id", id);

        if (error) {
            alert("Errore eliminazione: " + error.message);
            return;
        }

        setClients((prev) => prev.filter((client) => client.id !== id));
        if (selectedClientId === id) setSelectedClientId(null);
    };

    if (loading) {
        return <div className="text-center p-8 text-white/50">Caricamento clienti...</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca nominativi, città, telefono, email..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-brand-accent/60"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                            aria-label="Pulisci ricerca"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        placeholder="Nuova colonna"
                        className="flex-1 md:w-52 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:border-brand-accent/60"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddColumn();
                            }
                        }}
                    />
                    <button
                        onClick={handleAddColumn}
                        className="px-3 py-2 rounded-lg bg-brand-accent hover:opacity-90 text-white text-sm font-medium flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Colonna
                    </button>
                    <AddClientActions onClientAdded={fetchClients} />
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="w-full glass-panel p-8 min-h-[380px] flex flex-col items-center justify-center text-center border-dashed">
                    <h3 className="text-xl font-medium text-white/80">Nessun cliente salvato</h3>
                    <p className="text-white/45 mt-2 max-w-sm">
                        Aggiungi nominativi dal pulsante in alto, poi trascinali tra le colonne del board.
                    </p>
                </div>
            ) : (
                <div className={selectedClient ? "grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4" : ""}>
                    <div className={selectedClient ? "glass-panel p-4 overflow-x-auto" : "glass-panel p-4 overflow-x-auto w-full"}>
                        <div className="flex gap-4 min-h-[560px]">
                            {groupedClients.map((column) => (
                                <div
                                    key={column.id}
                                    className={`w-[300px] shrink-0 rounded-xl border border-white/10 bg-black/35 flex flex-col transition-shadow ${draggedColumnId === column.id ? "ring-2 ring-brand-accent/60" : ""}`}
                                    draggable
                                    onDragStart={() => setDraggedColumnId(column.id)}
                                    onDragEnd={() => setDraggedColumnId(null)}
                                    onDragOver={(e) => {
                                        // Permetti drop solo tra colonne
                                        if (draggedColumnId) e.preventDefault();
                                    }}
                                    onDrop={(e) => {
                                        if (draggedColumnId) {
                                            moveColumn(draggedColumnId, column.id);
                                            setDraggedColumnId(null);
                                        } else {
                                            handleDropOnColumn(column.id);
                                        }
                                    }}
                                >
                                    <div className="px-3 py-3 border-b border-white/10 flex items-start justify-between gap-2 cursor-move">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-white text-sm">{column.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${column.colorClass}`}>
                                                    {column.clients.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleRenameColumn(column.id)}
                                                className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70"
                                                title="Modifica nome colonna"
                                            >
                                                Modifica
                                            </button>
                                            <button
                                                onClick={() => handleDeleteColumn(column.id)}
                                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                                title="Elimina colonna"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-3 space-y-3 overflow-y-auto min-h-[420px] max-h-[620px]">
                                        {column.clients.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-white/15 text-center text-xs text-white/35 p-4">
                                                Trascina qui i nominativi
                                            </div>
                                        ) : (
                                            column.clients.map((client) => {
                                                const isActive = selectedClientId === client.id;
                                                const contactCounter = contactCounts[client.id] ?? 0;

                                                return (
                                                    <button
                                                        key={client.id}
                                                        draggable
                                                        onDragStart={() => setDraggedClientId(client.id)}
                                                        onDragEnd={() => setDraggedClientId(null)}
                                                        onClick={() => setSelectedClientId(client.id)}
                                                        className={`w-full text-left rounded-lg border p-3 transition-all ${
                                                            isActive
                                                                ? "border-brand-accent/60 bg-brand-accent/10"
                                                                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-white leading-tight">
                                                                    {client.business_name || "Senza nome"}
                                                                </p>
                                                                <p className="text-xs text-white/50 mt-1">
                                                                    {client.city || "-"}
                                                                    {client.province ? ` (${client.province})` : ""}
                                                                </p>
                                                            </div>
                                                            <GripVertical className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                                                            {client.phone && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Phone className="w-3 h-3" /> {client.phone}
                                                                </span>
                                                            )}
                                                            {client.email && (
                                                                <span className="inline-flex items-center gap-1 max-w-full truncate">
                                                                    <Mail className="w-3 h-3" /> {client.email}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
                                                            <span>{client.keyword || "-"}</span>
                                                            <span>{contactCounter} contatti</span>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedClient && (
                        <aside className="glass-panel p-4 min-h-[560px]">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-medium text-white leading-tight">
                                            {selectedClient.business_name}
                                        </h3>
                                        <p className="text-xs text-white/50 mt-1">
                                            {selectedClient.city || "-"}
                                            {selectedClient.province ? ` (${selectedClient.province})` : ""}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onClick={() => setSelectedClientId(null)}
                                            className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white/60"
                                            title="Chiudi pannello"
                                            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClient(selectedClient.id)}
                                            className="p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                            title="Elimina nominativo"
                                            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/55">Email</label>
                                    <input
                                        type="email"
                                        value={detailDraft.email}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent/60"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/55">Telefono</label>
                                    <input
                                        type="text"
                                        value={detailDraft.phone}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent/60"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/55">Sito web</label>
                                    <input
                                        type="text"
                                        value={detailDraft.website}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, website: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent/60"
                                    />
                                    <div className="flex items-center gap-2 text-xs">
                                        {selectedClient.website && (
                                            <a
                                                href={selectedClient.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-gradient-1 hover:underline inline-flex items-center gap-1"
                                            >
                                                Sito <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {selectedClient.google_maps_url && (
                                            <a
                                                href={selectedClient.google_maps_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-accent hover:underline inline-flex items-center gap-1"
                                            >
                                                Maps <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/55">Data follow-up</label>
                                    <input
                                        type="date"
                                        value={detailDraft.follow_up_date}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent/60"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/55">Note</label>
                                    <textarea
                                        value={detailDraft.notes}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, notes: e.target.value }))}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent/60 resize-y"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => logContact("chiamata")}
                                        className="px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-sm flex items-center justify-center gap-1.5"
                                    >
                                        <Phone className="w-4 h-4" /> Chiamata
                                    </button>
                                    <button
                                        onClick={() => logContact("email")}
                                        className="px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-sm flex items-center justify-center gap-1.5"
                                    >
                                        <Mail className="w-4 h-4" /> Email
                                    </button>
                                </div>

                                <button
                                    onClick={handleSaveDetails}
                                    disabled={savingDetails}
                                    className="w-full px-3 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> {savingDetails ? "Salvataggio..." : "Salva dettagli"}
                                </button>

                                <div className="pt-2 border-t border-white/10">
                                    <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                                        <span>Ultimo contatto</span>
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {selectedClient.last_contact_date
                                                ? new Date(selectedClient.last_contact_date).toLocaleDateString("it-IT")
                                                : "Nessuno"}
                                        </span>
                                    </div>
                                    <FollowUpHistory clientId={selectedClient.id} />
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            )}
        </div>
    );
}
