"use client";

import { LogOut, Home, Users, ChartColumn } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { SavedClientsTable } from "@/components/SavedClientsTable";

export default function ClientiPage() {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-brand-accent selection:text-white">
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-brand-gradient-1/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
                    <div className="container flex items-center justify-between h-16 px-4 mx-auto sm:px-8">
                        <div className="flex items-center gap-2">
                            <Image src="/saksweb.png" alt="Saks Logo" width={120} height={40} className="object-contain" />
                            <span className="px-2 py-0.5 text-xs font-medium tracking-wider text-brand-accent border border-brand-accent/30 rounded-full uppercase bg-brand-accent/10">mini-crm</span>
                        </div>
                        <nav className="flex items-center gap-6">
                            <Link href="/" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                                <Home className="w-4 h-4" /> <span className="hidden sm:inline">Ricerca</span>
                            </Link>
                            <Link href="/clienti" className="text-sm font-medium text-brand-accent flex items-center gap-2">
                                <Users className="w-4 h-4" /> <span className="hidden sm:inline">Clienti Selezionati</span>
                            </Link>
                            <Link href="/analytics" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                                <ChartColumn className="w-4 h-4" /> <span className="hidden sm:inline">Analytics</span>
                            </Link>
                            <button onClick={handleLogout} className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2 ml-4">
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Esci</span>
                            </button>
                        </nav>
                    </div>
                </header>

                <main className="flex-1 container px-4 py-12 mx-auto sm:px-8 max-w-7xl">
                    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center mb-16 space-y-6">
                        <h1 className="text-4xl sm:text-5xl font-normal tracking-tight">
                            I tuoi <span className="font-semibold text-brand-accent">Clienti.</span>
                        </h1>
                        <p className="text-lg text-white/60 max-w-xl">
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
