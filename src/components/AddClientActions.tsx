"use client";

import { useState } from "react";
import { Plus, Link, UserPlus, Save, X, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function AddClientActions({ onClientAdded }: { onClientAdded: () => void }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [dialogType, setDialogType] = useState<"manual" | "gmb" | null>(null);
    const [loading, setLoading] = useState(false);
    const [gmbUrl, setGmbUrl] = useState("");
    
    // Manual form state
    const [manualClient, setManualClient] = useState({
        business_name: "",
        city: "",
        province: "",
        address: "",
        phone: "",
        website: "",
        email: "",
        notes: ""
    });

    const supabase = createClient();

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualClient.business_name) return;

        setLoading(true);
        const { error } = await supabase
            .from('saved_clients')
            .insert([manualClient]);

        setLoading(false);
        if (error) {
            alert("Errore durante il salvataggio: " + error.message);
        } else {
            resetForm();
            onClientAdded();
        }
    };

    const handleGMBImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gmbUrl) return;

        setLoading(true);
        try {
            const res = await fetch('/api/import-gmb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gmbUrl })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Errore importazione");

            // Save to Supabase
            const { error } = await supabase
                .from('saved_clients')
                .insert([data]);

            if (error) throw error;

            resetForm();
            onClientAdded();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setDialogType(null);
        setGmbUrl("");
        setManualClient({
            business_name: "",
            city: "",
            province: "",
            address: "",
            phone: "",
            website: "",
            email: "",
            notes: ""
        });
        setIsMenuOpen(false);
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setDialogType("manual")}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border border-brand-accent/20 rounded-lg transition-all text-sm font-medium"
                >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Aggiungi Manuale</span>
                </button>
                <button
                    onClick={() => setDialogType("gmb")}
                    className="flex items-center gap-2 rounded-lg border border-brand-primary/20 bg-brand-primary/10 px-4 py-2 text-sm font-medium text-brand-primary transition-all hover:bg-brand-primary/15 dark:border-brand-border dark:text-brand-text"
                >
                    <Link className="w-4 h-4" />
                    <span className="hidden sm:inline">Importa da GMB</span>
                </button>
            </div>

            {/* Dialog Overlay */}
            {dialogType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-lg animate-in fade-in zoom-in border border-brand-border p-6 shadow-2xl duration-200 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="flex items-center gap-2 text-xl font-semibold text-brand-text">
                                {dialogType === "manual" ? (
                                    <><UserPlus className="w-5 h-5 text-brand-accent" /> Nuovo Cliente</>
                                ) : (
                                    <><Link className="w-5 h-5 text-brand-accent" /> Importa da Google Maps</>
                                )}
                            </h3>
                            <button onClick={resetForm} className="rounded-full p-1 transition-colors hover:bg-brand-background dark:hover:bg-brand-surface">
                                <X className="w-5 h-5 text-brand-muted" />
                            </button>
                        </div>

                        {dialogType === "manual" ? (
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-brand-muted uppercase mb-1.5 ml-1">Nome Business *</label>
                                    <input
                                        required
                                        value={manualClient.business_name}
                                        onChange={e => setManualClient({ ...manualClient, business_name: e.target.value })}
                                        className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                        placeholder="Esempio: Ristorante Da Mario"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-brand-muted uppercase mb-1.5 ml-1">Città</label>
                                        <input
                                            value={manualClient.city}
                                            onChange={e => setManualClient({ ...manualClient, city: e.target.value })}
                                            className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                            placeholder="Milano"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-brand-muted uppercase mb-1.5 ml-1">Provincia</label>
                                        <input
                                            value={manualClient.province}
                                            onChange={e => setManualClient({ ...manualClient, province: e.target.value })}
                                            className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                            placeholder="MI"
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-brand-muted uppercase mb-1.5 ml-1">Telefono</label>
                                        <input
                                            value={manualClient.phone}
                                            onChange={e => setManualClient({ ...manualClient, phone: e.target.value })}
                                            className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                            placeholder="+39 02..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-brand-muted uppercase mb-1.5 ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={manualClient.email}
                                            onChange={e => setManualClient({ ...manualClient, email: e.target.value })}
                                            className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                            placeholder="info@esempio.it"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !manualClient.business_name}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 mt-4"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Salva Cliente
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleGMBImport} className="space-y-4">
                                <p className="mb-2 text-sm text-brand-muted">
                                    Incolla il link della scheda Google My Business (es. maps.google.com/...) per estrarre automaticamente i dettagli.
                                </p>
                                <div>
                                    <label className="block text-xs font-medium text-brand-muted uppercase mb-1.5 ml-1">Link Google Maps</label>
                                    <input
                                        required
                                        value={gmbUrl}
                                        onChange={e => setGmbUrl(e.target.value)}
                                        className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                        placeholder="https://www.google.com/maps/place/..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !gmbUrl}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary hover:opacity-90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 mt-4 shadow-lg shadow-brand-primary/20"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Importa Dati
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
