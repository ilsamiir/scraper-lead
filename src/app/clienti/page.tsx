"use client";

import { LogOut, Home, Users, ChartColumn } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { SavedClientsTable } from "@/components/SavedClientsTable";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ClientiPage() {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-brand-background text-brand-text selection:bg-brand-accent/30 selection:text-brand-text font-sans">
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 blur-[120px] rounded-full mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-brand-accent/10 blur-[120px] rounded-full mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <header className="sticky top-0 z-50 w-full border-b border-brand-border bg-brand-surface/85 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:bg-[color:color-mix(in_srgb,var(--brand-background)_76%,var(--brand-surface)_24%)] dark:shadow-none">
                    <div className="container flex items-center justify-between h-16 px-4 mx-auto sm:px-8 max-w-[1440px]">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold font-heading tracking-tight">WebNovation</span>
                            <span className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-brand-accent border border-brand-accent/30 rounded-full uppercase bg-brand-accent/10">Intelligence</span>
                        </div>
                        <nav className="flex items-center gap-6">
                            <Link href="/" className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors flex items-center gap-2">
                                <Home className="w-4 h-4" /> <span className="hidden sm:inline">Ricerca</span>
                            </Link>
                            <Link href="/clienti" className="inline-flex items-center gap-2 rounded-full border border-brand-accent/35 bg-brand-accent/18 px-3 py-2 text-sm font-semibold text-brand-accent shadow-[0_0_0_1px_rgba(196,181,253,0.08)] dark:bg-brand-accent/20 dark:text-[#F3EEFF] dark:shadow-[0_0_0_1px_rgba(196,181,253,0.16)]">
                                <Users className="w-4 h-4" /> <span className="hidden sm:inline">Clienti Selezionati</span>
                            </Link>
                            <Link href="/analytics" className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors flex items-center gap-2">
                                <ChartColumn className="w-4 h-4" /> <span className="hidden sm:inline">Analytics</span>
                            </Link>
                            <div className="flex items-center gap-2 ml-4 border-l border-brand-border pl-4">
                                <ThemeToggle />
                                <button onClick={handleLogout} className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors flex items-center gap-2 rounded-full px-3 py-2 hover:bg-brand-background dark:hover:bg-brand-surface">
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Esci</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                </header>

                <main className="flex-1 container px-4 py-12 mx-auto sm:px-8 max-w-[1440px]">
                    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center mb-16 space-y-6">
                        <h1 className="text-[40px] sm:text-[56px] font-bold font-heading tracking-tight leading-[1.1]">
                            I tuoi <span className="text-gradient">Clienti.</span>
                        </h1>
                        <p className="text-lg text-brand-muted max-w-xl leading-[1.6]">
                            Gestisci i tuoi contatti, aggiorna le email e programma i follow-up.
                        </p>
                    </div>
                    <div className="w-full">
                        <SavedClientsTable />
                    </div>
                </main>
            </div>
        </div>
    );
}
