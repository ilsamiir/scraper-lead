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
                    className="flex items-center gap-2 px-4 py-2 bg-brand-gradient-1/10 hover:bg-brand-gradient-1/20 text-white border border-white/10 rounded-lg transition-all text-sm font-medium"
                >
                    <Link className="w-4 h-4" />
                    <span className="hidden sm:inline">Importa da GMB</span>
                </button>
            </div>

            {/* Dialog Overlay */}
            {dialogType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg glass-panel p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                {dialogType === "manual" ? (
                                    <><UserPlus className="w-5 h-5 text-brand-accent" /> Nuovo Cliente</>
                                ) : (
                                    <><Link className="w-5 h-5 text-brand-accent" /> Importa da Google Maps</>
                                )}
                            </h3>
                            <button onClick={resetForm} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-white/50" />
                            </button>
                        </div>

                        {dialogType === "manual" ? (
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/50 uppercase mb-1.5 ml-1">Nome Business *</label>
                                    <input
                                        required
                                        value={manualClient.business_name}
                                        onChange={e => setManualClient({ ...manualClient, business_name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-accent/50"
                                        placeholder="Esempio: Ristorante Da Mario"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-1.5 ml-1">Città</label>
                                        <input
                                            value={manualClient.city}
                                            onChange={e => setManualClient({ ...manualClient, city: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-accent/50"
                                            placeholder="Milano"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-1.5 ml-1">Provincia</label>
                                        <input
                                            value={manualClient.province}
                                            onChange={e => setManualClient({ ...manualClient, province: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-accent/50"
                                            placeholder="MI"
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-1.5 ml-1">Telefono</label>
                                        <input
                                            value={manualClient.phone}
                                            onChange={e => setManualClient({ ...manualClient, phone: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-accent/50"
                                            placeholder="+39 02..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-1.5 ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={manualClient.email}
                                            onChange={e => setManualClient({ ...manualClient, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-accent/50"
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
                                <p className="text-sm text-white/60 mb-2">
                                    Incolla il link della scheda Google My Business (es. maps.google.com/...) per estrarre automaticamente i dettagli.
                                </p>
                                <div>
                                    <label className="block text-xs font-medium text-white/50 uppercase mb-1.5 ml-1">Link Google Maps</label>
                                    <input
                                        required
                                        value={gmbUrl}
                                        onChange={e => setGmbUrl(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-accent/50"
                                        placeholder="https://www.google.com/maps/place/..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !gmbUrl}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-gradient-1 hover:opacity-90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 mt-4 shadow-lg shadow-brand-gradient-1/20"
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
