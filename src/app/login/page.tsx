"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Map custom username to internal email domain for Supabase Auth compatibility
        const authEmail = username.includes("@") ? username : `${username}@saks.agency`;

        const { error } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/");
            router.refresh();
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-brand-background p-4 text-brand-text selection:bg-brand-accent selection:text-brand-text">
            {/* Dynamic Background Element */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] h-[60%] w-[60%] rounded-full bg-brand-accent/20 blur-[120px] mix-blend-screen" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="glass-panel rounded-3xl border border-brand-border p-8 text-center shadow-2xl sm:p-12 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]">
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <span className="text-3xl font-bold tracking-tight text-brand-text">saks.</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Accesso Riservato</h2>
                    <p className="mb-8 text-sm text-brand-muted">Inserisci le credenziali per generare i preventivi.</p>

                    <form onSubmit={handleLogin} className="flex flex-col gap-5 text-left">
                        <div>
                            <label className="mb-1.5 ml-1 block text-sm font-medium text-brand-muted">Username</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-all placeholder:text-brand-muted focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                placeholder="Inserisci username"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 ml-1 block text-sm font-medium text-brand-muted">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-all placeholder:text-brand-muted focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
                                placeholder="Inserisci password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex w-full items-center justify-center rounded-xl bg-brand-accent py-3.5 font-medium text-white transition-all active:scale-95 hover:opacity-90"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                "Accedi"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
