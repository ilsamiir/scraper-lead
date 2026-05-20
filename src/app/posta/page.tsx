"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChartColumn, Home, LogOut, Mail, Users } from "lucide-react";
import { EmailHistoryArchive } from "@/components/EmailHistoryArchive";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/utils/supabase/client";

export default function PostaPage() {
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
                <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-brand-primary/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
                <div className="absolute right-[-10%] top-[20%] h-[50%] w-[30%] rounded-full bg-brand-accent/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
            </div>

            <div className="relative z-10 flex min-h-screen flex-col">
                <header className="sticky top-0 z-50 w-full border-b border-brand-border bg-brand-surface/85 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:bg-[color:color-mix(in_srgb,var(--brand-background)_76%,var(--brand-surface)_24%)] dark:shadow-none">
                    <div className="container mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-8">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold font-heading tracking-tight">WebNovation</span>
                            <span className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-accent">Intelligence</span>
                        </div>
                        <nav className="flex items-center gap-6">
                            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-brand-muted transition-colors hover:text-brand-text">
                                <Home className="h-4 w-4" /> <span className="hidden sm:inline">Ricerca</span>
                            </Link>
                            <Link href="/clienti" className="flex items-center gap-2 text-sm font-medium text-brand-muted transition-colors hover:text-brand-text">
                                <Users className="h-4 w-4" /> <span className="hidden sm:inline">Clienti Selezionati</span>
                            </Link>
                            <Link href="/analytics" className="flex items-center gap-2 text-sm font-medium text-brand-muted transition-colors hover:text-brand-text">
                                <ChartColumn className="h-4 w-4" /> <span className="hidden sm:inline">Analytics</span>
                            </Link>
                            <Link href="/posta" className="inline-flex items-center gap-2 rounded-full border border-brand-accent/35 bg-brand-accent/18 px-3 py-2 text-sm font-semibold text-brand-accent shadow-[0_0_0_1px_rgba(196,181,253,0.08)] dark:bg-brand-accent/20 dark:text-[#F3EEFF] dark:shadow-[0_0_0_1px_rgba(196,181,253,0.16)]">
                                <Mail className="h-4 w-4" /> <span className="hidden sm:inline">Posta</span>
                            </Link>
                            <div className="ml-4 flex items-center gap-2 border-l border-brand-border pl-4">
                                <ThemeToggle />
                                <button onClick={handleLogout} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-background hover:text-brand-text dark:hover:bg-brand-surface">
                                    <LogOut className="h-4 w-4" />
                                    <span className="hidden sm:inline">Esci</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                </header>

                <main className="container mx-auto flex-1 px-4 py-12 sm:px-8 max-w-[1440px]">
                    <div className="mb-10 flex max-w-3xl flex-col items-center justify-center space-y-4 text-center">
                        <h1 className="text-[40px] font-bold font-heading leading-[1.1] tracking-tight sm:text-[56px]">
                            Archivio <span className="text-gradient">Posta.</span>
                        </h1>
                        <p className="max-w-2xl text-lg leading-[1.6] text-brand-muted">
                            Consulta la cronologia completa di tutte le email inviate e apri ogni messaggio per leggere il corpo esatto spedito.
                        </p>
                    </div>

                    <EmailHistoryArchive />
                </main>
            </div>
        </div>
    );
}