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
        <div className="min-h-screen bg-black text-white selection:bg-brand-accent selection:text-white flex items-center justify-center p-4">
            {/* Dynamic Background Element */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-brand-accent/20 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="glass-panel p-8 sm:p-12 text-center rounded-3xl border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <span className="text-3xl font-bold tracking-tight text-white">saks.</span>
                    </div>

                    <h2 className="text-2xl font-medium mb-2">Area Riservata</h2>
                    <p className="text-white/50 mb-8 text-sm">Piattaforma di lead-scraper interna. Accedi per conquistare l'universo digitale.</p>

                    <form onSubmit={handleLogin} className="flex flex-col gap-5 text-left">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5 ml-1">Credenziali d'accesso</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all"
                                placeholder="saksagency_root"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all"
                                placeholder="••••••••"
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
                            className="mt-2 w-full bg-white text-black font-medium py-3.5 rounded-xl hover:bg-white/90 transition-all active:scale-95 flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
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
