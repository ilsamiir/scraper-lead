"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
    Calendar as CalendarIcon,
    ExternalLink,
    GripVertical,
    LayoutGrid,
    List,
    Mail,
    Phone,
    Plus,
    Save,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { AddClientActions } from "@/components/AddClientActions";
import { EmailHistoryPanel } from "@/components/EmailHistoryPanel";
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

type ViewMode = "board" | "list";

const DEFAULT_COLUMNS: BoardColumn[] = [
    { id: "Da contattare", title: "Da contattare", colorClass: "bg-sky-100 dark:bg-blue-500/15 text-sky-900 dark:text-blue-300 border-sky-300 dark:border-blue-400/30" },
    { id: "In lavorazione", title: "In lavorazione", colorClass: "bg-amber-100 dark:bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-400/30" },
    { id: "Da richiamare", title: "Da richiamare", colorClass: "bg-violet-100 dark:bg-purple-500/15 text-violet-900 dark:text-purple-300 border-violet-300 dark:border-purple-400/30" },
    { id: "Convertiti", title: "Convertiti", colorClass: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30" },
];

const STORAGE_KEY = "lead-intelligence:clienti-columns:v1";
const VIEW_MODE_STORAGE_KEY = "lead-intelligence:clienti-view-mode:v1";

const sanitizeColumnName = (value: string) => value.trim().replace(/\s+/g, " ");
const formatLastContactDate = (value?: string | null) => {
    if (!value) return "Nessuno";

    return new Date(value).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

export function SavedClientsTable() {
    const [supabase] = useState(() => createClient());
    const [authReady, setAuthReady] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    const [clients, setClients] = useState<SavedClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
    const [columns, setColumns] = useState<BoardColumn[]>(DEFAULT_COLUMNS);
    const [viewMode, setViewMode] = useState<ViewMode>("board");
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

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailDraft, setEmailDraft] = useState({ subject: "", body: "" });
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailGenerationError, setEmailGenerationError] = useState<string | null>(null);
    const [emailHistoryRefreshToken, setEmailHistoryRefreshToken] = useState(0);

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
                queueMicrotask(() => {
                    setColumns(parsed);
                });
            }
        } catch {
            // ignore malformed local value
        }
    }, []);

    useEffect(() => {
        const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (raw === "board" || raw === "list") {
            queueMicrotask(() => {
                setViewMode(raw);
            });
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }, [viewMode]);

    // Wait for auth session to be ready before fetching data
    useEffect(() => {
        let active = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!active) return;
            setAuthReady(Boolean(session));
            setAuthChecked(true);
        });
        // Also check current session immediately (for cases where session is already set)
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!active) return;
                setAuthReady(Boolean(session));
            })
            .catch((error) => {
                console.error(error);
                if (!active) return;
                setAuthReady(false);
            })
            .finally(() => {
                if (active) setAuthChecked(true);
            });
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        if (!authReady) return;
        queueMicrotask(() => {
            void fetchClients();
        });
    }, [authReady, fetchClients]);

    useEffect(() => {
        if (!selectedClient) return;

        queueMicrotask(() => {
            setDetailDraft({
                email: selectedClient.email ?? "",
                phone: selectedClient.phone ?? "",
                website: selectedClient.website ?? "",
                follow_up_date: selectedClient.follow_up_date ?? "",
                notes: selectedClient.notes ?? "",
            });
        });
    }, [selectedClient]);

    useEffect(() => {
        if (clients.length === 0) return;

        queueMicrotask(() => {
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
                    colorClass: "bg-slate-100 dark:bg-brand-surface text-slate-800 dark:text-brand-text border-slate-300 dark:border-brand-border",
                }));

                const next = [...previous, ...appended];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                return next;
            });
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

    const defaultColumnId = columns[0]?.id ?? "Da contattare";

    const getStatusBadgeClass = (status?: string | null) => {
        const normalizedStatus = status || defaultColumnId;
        return columns.find((column) => column.id === normalizedStatus)?.colorClass
            ?? "bg-slate-100 dark:bg-brand-surface text-slate-800 dark:text-brand-text border-slate-300 dark:border-brand-border";
    };

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
                colorClass: "bg-gray-100 dark:bg-brand-surface text-gray-700 dark:text-brand-text border-gray-200 dark:border-brand-border",
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

    const handleGenerateEmail = async () => {
        if (!selectedClient) return;
        if (!detailDraft.email && !selectedClient.email) {
            alert("Inserisci un indirizzo email per questo cliente prima di procedere.");
            return;
        }

        setIsGeneratingEmail(true);
        setIsEmailModalOpen(true);
        setEmailGenerationError(null);
        setEmailDraft({ subject: "", body: "" });

        try {
            const res = await fetch("/api/generate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientName: selectedClient.business_name,
                    website: detailDraft.website || selectedClient.website,
                    notes: detailDraft.notes || selectedClient.notes,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    typeof data?.error === "string" && data.error.trim().length > 0
                        ? data.error
                        : "Errore nella generazione dell'email"
                );
            }

            setEmailDraft({ subject: data.subject, body: data.body });
        } catch (error) {
            console.error(error);
            setEmailGenerationError(
                error instanceof Error && error.message.trim().length > 0
                    ? error.message
                    : "Impossibile generare l'email. Riprova."
            );
        } finally {
            setIsGeneratingEmail(false);
        }
    };

    const handleSendEmail = async () => {
        if (!selectedClient) return;
        const targetEmail = detailDraft.email || selectedClient.email;
        
        if (!targetEmail) {
            alert("Indirizzo email mancante.");
            return;
        }

        setIsSendingEmail(true);
        try {
            const res = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: selectedClient.id,
                    to: targetEmail,
                    subject: emailDraft.subject,
                    body: emailDraft.body,
                    source: "manual",
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(
                    typeof responseData?.error?.message === "string"
                        ? responseData.error.message
                        : typeof responseData?.error === "string"
                            ? responseData.error
                            : "Errore durante l'invio"
                );
            }

            if (responseData.historyLogged !== false) {
                const sentAt = typeof responseData.sentAt === "string"
                    ? responseData.sentAt
                    : new Date().toISOString();

                setClients((prev) => prev.map((client) => (
                    client.id === selectedClient.id
                        ? {
                            ...client,
                            last_contact_method: "email",
                            last_contact_date: sentAt,
                        }
                        : client
                )));
                setContactCounts((prev) => ({
                    ...prev,
                    [selectedClient.id]: (prev[selectedClient.id] ?? 0) + 1,
                }));
                setEmailHistoryRefreshToken((prev) => prev + 1);
            }

            setIsEmailModalOpen(false);
            alert(
                responseData.historyLogged === false
                    ? "Email inviata, ma lo storico non e stato salvato correttamente."
                    : "Email inviata con successo!"
            );
        } catch (error: unknown) {
            console.error(error);
            alert(
                `Errore invio email: ${error instanceof Error ? error.message : "Errore sconosciuto"}`
            );
        } finally {
            setIsSendingEmail(false);
        }
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

    if (!authChecked || loading) {
        return <div className="p-8 text-center text-brand-muted">Caricamento clienti...</div>;
    }

    if (!authReady) {
        return (
            <div className="rounded-2xl border border-brand-border bg-brand-surface px-6 py-10 text-center text-brand-muted dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                <p className="text-base text-brand-text">Sessione non valida o scaduta.</p>
                <p className="mt-2 text-sm">Effettua di nuovo l&apos;accesso per caricare i clienti selezionati.</p>
                <Link
                    href="/login"
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-brand-accent/35 bg-brand-accent/16 px-5 py-2 text-sm font-semibold text-brand-accent dark:text-[#F3EEFF]"
                >
                    Vai al login
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4" data-view-mode={viewMode}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cerca nominativi, città, telefono, email..."
                            className="w-full rounded-lg border border-brand-border bg-brand-surface py-2.5 pl-9 pr-10 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text"
                                aria-label="Pulisci ricerca"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="inline-flex w-full rounded-xl border border-brand-border bg-brand-surface p-1 lg:w-auto dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                        <button
                            type="button"
                            onClick={() => setViewMode("board")}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-none ${viewMode === "board" ? "bg-brand-accent text-white shadow-sm" : "text-brand-muted hover:bg-brand-background hover:text-brand-text dark:hover:bg-brand-surface"}`}
                            aria-pressed={viewMode === "board"}
                        >
                            <LayoutGrid className="h-4 w-4" /> Board
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-none ${viewMode === "list" ? "bg-brand-accent text-white shadow-sm" : "text-brand-muted hover:bg-brand-background hover:text-brand-text dark:hover:bg-brand-surface"}`}
                            aria-pressed={viewMode === "list"}
                        >
                            <List className="h-4 w-4" /> Lista
                        </button>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
                    {viewMode === "board" && (
                        <>
                            <input
                                type="text"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                placeholder="Nuova colonna"
                                className="flex-1 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent/60 sm:w-52 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddColumn();
                                    }
                                }}
                            />
                            <button
                                onClick={handleAddColumn}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                            >
                                <Plus className="w-4 h-4" /> Colonna
                            </button>
                        </>
                    )}
                    <AddClientActions onClientAdded={fetchClients} />
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="w-full glass-panel p-8 min-h-[380px] flex flex-col items-center justify-center text-center border-dashed">
                    <h3 className="text-xl font-medium text-brand-text">Nessun cliente salvato</h3>
                    <p className="text-brand-muted mt-2 max-w-sm">
                        Aggiungi nominativi dal pulsante in alto, poi trascinali tra le colonne del board.
                    </p>
                </div>
            ) : (
                <div className={selectedClient ? "grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]" : ""}>
                    <div className={selectedClient ? "glass-panel p-4 overflow-x-auto" : "glass-panel w-full overflow-x-auto p-4"}>
                        {viewMode === "board" ? (
                            <div className="flex gap-4 min-h-[560px]">
                                {groupedClients.map((column) => (
                                    <div
                                        key={column.id}
                                        className={`flex w-[300px] shrink-0 flex-col rounded-xl border border-brand-border surface-strong shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition-shadow dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_96%,white_4%)] dark:shadow-none ${draggedColumnId === column.id ? "ring-2 ring-brand-accent/60" : ""}`}
                                        draggable={!draggedClientId}
                                        onDragStart={(e) => {
                                            if (draggedClientId) { e.preventDefault(); return; }
                                            setDraggedColumnId(column.id);
                                        }}
                                        onDragEnd={() => setDraggedColumnId(null)}
                                        onDragOver={(e) => {
                                            if (draggedColumnId || draggedClientId) e.preventDefault();
                                        }}
                                        onDrop={() => {
                                            if (draggedColumnId) {
                                                moveColumn(draggedColumnId, column.id);
                                                setDraggedColumnId(null);
                                            } else {
                                                handleDropOnColumn(column.id);
                                            }
                                        }}
                                    >
                                        <div className="flex cursor-move items-start justify-between gap-2 border-b border-brand-border px-3 py-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-brand-text text-sm">{column.title}</h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${column.colorClass}`}>
                                                        {column.clients.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleRenameColumn(column.id)}
                                                    className="rounded px-2 py-1 text-xs text-brand-muted surface-subtle hover:bg-brand-background dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_90%,white_10%)] dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_84%,white_16%)]"
                                                    title="Modifica nome colonna"
                                                >
                                                    Modifica
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteColumn(column.id)}
                                                    className="p-1.5 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400"
                                                    title="Elimina colonna"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3 space-y-3 overflow-y-auto min-h-[420px] max-h-[620px]">
                                            {column.clients.length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-brand-border p-4 text-center text-xs text-brand-muted">
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
                                                            onDragStart={(e) => { e.stopPropagation(); setDraggedClientId(client.id); }}
                                                            onDragEnd={(e) => { e.stopPropagation(); setDraggedClientId(null); }}
                                                            onClick={() => setSelectedClientId(client.id)}
                                                            className={`w-full text-left rounded-lg border p-3 transition-all ${
                                                                isActive
                                                                    ? "border-brand-accent/60 bg-brand-accent/10 shadow-[0_10px_24px_rgba(109,40,217,0.12)]"
                                                                    : "border-brand-border bg-brand-surface hover:bg-brand-background/70 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)] dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_88%,white_12%)]"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="text-sm font-medium text-brand-text leading-tight">
                                                                        {client.business_name || "Senza nome"}
                                                                    </p>
                                                                    <p className="text-xs text-brand-muted mt-1">
                                                                        {client.city || "-"}
                                                                        {client.province ? ` (${client.province})` : ""}
                                                                    </p>
                                                                </div>
                                                                <GripVertical className="w-4 h-4 text-brand-muted shrink-0 mt-0.5" />
                                                            </div>

                                                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-muted">
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

                                                            <div className="mt-2 flex items-center justify-between text-[11px] text-brand-muted">
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
                        ) : (
                            <div className="min-h-[560px] overflow-hidden rounded-2xl border border-brand-border bg-brand-surface dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                                <div className="grid min-w-[760px] grid-cols-[minmax(240px,2.2fr)_minmax(160px,1.1fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(170px,1fr)] gap-4 border-b border-brand-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
                                    <span>Cliente</span>
                                    <span>Metodo</span>
                                    <span>Ultimo contatto</span>
                                    <span>Stato</span>
                                    <span>Città</span>
                                </div>

                                {filteredClients.length === 0 ? (
                                    <div className="flex min-h-[500px] items-center justify-center px-6 text-center text-sm text-brand-muted">
                                        Nessun cliente trovato con i filtri correnti.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-brand-border">
                                        {filteredClients.map((client) => {
                                            const isActive = selectedClientId === client.id;
                                            const statusLabel = client.status || defaultColumnId;

                                            return (
                                                <button
                                                    key={client.id}
                                                    type="button"
                                                    onClick={() => setSelectedClientId(client.id)}
                                                    className={`grid w-full min-w-[760px] grid-cols-[minmax(240px,2.2fr)_minmax(160px,1.1fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(170px,1fr)] gap-4 px-4 py-4 text-left transition-colors ${isActive ? "bg-brand-accent/10" : "hover:bg-brand-background/70 dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_88%,white_12%)]"}`}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-medium text-brand-text">
                                                            {client.business_name || "Senza nome"}
                                                        </span>
                                                        <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                                                            <span>{contactCounts[client.id] ?? 0} contatti</span>
                                                            {client.phone ? <span>{client.phone}</span> : null}
                                                            {client.email ? <span className="truncate">{client.email}</span> : null}
                                                        </span>
                                                    </span>
                                                    <span className="text-sm text-brand-text capitalize">
                                                        {client.last_contact_method || "Nessuno"}
                                                    </span>
                                                    <span className="text-sm text-brand-text">
                                                        {formatLastContactDate(client.last_contact_date)}
                                                    </span>
                                                    <span>
                                                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(statusLabel)}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </span>
                                                    <span className="text-sm text-brand-text">
                                                        {client.city || "-"}
                                                        {client.province ? ` (${client.province})` : ""}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedClient && (
                        <aside className="glass-panel min-h-[560px] border border-brand-border bg-brand-surface p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)] dark:shadow-none">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-medium text-brand-text leading-tight">
                                            {selectedClient.business_name}
                                        </h3>
                                        <p className="text-xs text-brand-muted mt-1">
                                            {selectedClient.city || "-"}
                                            {selectedClient.province ? ` (${selectedClient.province})` : ""}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onClick={() => setSelectedClientId(null)}
                                            className="rounded-md bg-gray-100 p-2 text-brand-muted hover:bg-gray-200 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_90%,white_10%)] dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_84%,white_16%)]"
                                            title="Chiudi pannello"
                                            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClient(selectedClient.id)}
                                            className="p-2 rounded-md bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400"
                                            title="Elimina nominativo"
                                            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-brand-muted">Email</label>
                                    <input
                                        type="email"
                                        value={detailDraft.email}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, email: e.target.value }))}
                                        className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-brand-muted">Telefono</label>
                                    <input
                                        type="text"
                                        value={detailDraft.phone}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-brand-muted">Sito web</label>
                                    <input
                                        type="text"
                                        value={detailDraft.website}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, website: e.target.value }))}
                                        className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    />
                                    <div className="flex items-center gap-2 text-xs">
                                        {selectedClient.website && (
                                            <a
                                                href={selectedClient.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-primary hover:text-brand-accent hover:underline inline-flex items-center gap-1 font-medium"
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
                                    <label className="text-xs text-brand-muted">Data follow-up</label>
                                    <input
                                        type="date"
                                        value={detailDraft.follow_up_date}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                                        className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-brand-muted">Note</label>
                                    <textarea
                                        value={detailDraft.notes}
                                        onChange={(e) => setDetailDraft((prev) => ({ ...prev, notes: e.target.value }))}
                                        rows={4}
                                        className="w-full resize-y rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => logContact("chiamata")}
                                        className="px-3 py-2 rounded-lg bg-sky-100 dark:bg-blue-500/10 hover:bg-sky-200 dark:hover:bg-blue-500/20 text-sky-900 dark:text-blue-300 text-sm font-medium flex items-center justify-center gap-1.5"
                                    >
                                        <Phone className="w-4 h-4" /> Chiamata
                                    </button>
                                    <button
                                        onClick={handleGenerateEmail}
                                        className="px-3 py-2 rounded-lg bg-violet-100 dark:bg-purple-500/10 hover:bg-violet-200 dark:hover:bg-purple-500/20 text-violet-900 dark:text-purple-300 text-sm font-medium flex items-center justify-center gap-1.5"
                                    >
                                        <Mail className="w-4 h-4" /> Email AI
                                    </button>
                                </div>

                                <button
                                    onClick={handleSaveDetails}
                                    disabled={savingDetails}
                                    className="w-full px-3 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> {savingDetails ? "Salvataggio..." : "Salva dettagli"}
                                </button>

                                <div className="border-t border-brand-border pt-2">
                                    <div className="flex items-center justify-between text-xs text-brand-muted mb-2">
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

                                <EmailHistoryPanel clientId={selectedClient.id} refreshToken={emailHistoryRefreshToken} />
                            </div>
                        </aside>
                    )}
                </div>
            )}

            {/* Email Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-brand-border bg-brand-surface shadow-2xl dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_96%,white_4%)]">
                        <div className="flex items-center justify-between border-b border-brand-border p-4">
                            <h3 className="text-lg font-medium text-brand-text flex items-center gap-2">
                                <Mail className="w-5 h-5 text-brand-accent" />
                                Bozza Email per {selectedClient?.business_name}
                            </h3>
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                    className="rounded-md p-2 text-brand-muted hover:bg-brand-background dark:hover:bg-brand-surface"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto flex-1 space-y-4">
                            {isGeneratingEmail ? (
                                <div className="flex flex-col items-center justify-center space-y-4 py-12 text-brand-muted">
                                    <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                                    <p>Generazione email in corso con AI...</p>
                                </div>
                            ) : (
                                <>
                                    {emailGenerationError ? (
                                        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                                            {emailGenerationError}
                                        </div>
                                    ) : null}
                                    <div className="space-y-2">
                                        <label className="text-sm text-brand-text">Oggetto</label>
                                        <input
                                            type="text"
                                            value={emailDraft.subject}
                                            onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
                                            className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-brand-text">Messaggio</label>
                                        <textarea
                                            value={emailDraft.body}
                                            onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))}
                                            rows={12}
                                            className="w-full resize-y rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent/60 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-brand-border p-4">
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="surface-subtle rounded-lg px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-background dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_90%,white_10%)] dark:hover:bg-[color:color-mix(in_srgb,var(--brand-surface)_84%,white_16%)]"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={isGeneratingEmail || isSendingEmail || !emailDraft.subject || !emailDraft.body}
                                className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSendingEmail ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Invio in corso...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" /> Invia Email
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
