"use client";

import { LogOut, Home as HomeIcon, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { LeadsTable } from "@/components/LeadsTable";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const [leads, setLeads] = useState<any[]>([]);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSearch = async (keyword: string, location: string) => {
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, location }),
      });
      const data = await res.json();
      if (data.results) {
        setLeads(data.results);
      } else if (data.error) {
        alert("Ricerca fallita: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore imprevisto.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-accent selection:text-white">
      {/* Dynamic Background Element */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-brand-gradient-1/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
          <div className="container flex items-center justify-between h-16 px-4 mx-auto sm:px-8">
            <div className="flex items-center gap-2">
              <Image src="/saksweb.png" alt="Saks Logo" width={120} height={40} className="object-contain" />
              <span className="px-2 py-0.5 text-xs font-medium tracking-wider text-brand-accent border border-brand-accent/30 rounded-full uppercase bg-brand-accent/10">mini-crm</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-brand-accent flex items-center gap-2">
                <HomeIcon className="w-4 h-4" /> <span className="hidden sm:inline">Ricerca</span>
              </Link>
              <Link href="/clienti" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                <Users className="w-4 h-4" /> <span className="hidden sm:inline">Clienti Selezionati</span>
              </Link>
              <Link href="/promemoria" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">Promemoria</span>
              </Link>
              <button onClick={handleLogout} className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2 ml-4">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container px-4 py-12 mx-auto sm:px-8 max-w-7xl">
          {/* Hero Section */}
          <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center mb-16 space-y-6">
            <h1 className="text-4xl sm:text-6xl font-normal tracking-tight">
              Conquista l'universo <span className="font-semibold text-brand-accent">digitale.</span>
            </h1>
            <p className="text-lg text-white/60 max-w-xl">
              Inserisci un settore e una località per ricercare i potenziali clienti. Una volta estratti i risultati, ti suggeriamo di navigare i siti web elencati per recuperare gli indirizzi email mancanti.
            </p>

            {/* Smart Search Form */}
            <SearchForm onSearch={handleSearch} />
          </div>

          {/* Results Area */}
          <div className="w-full">
            <LeadsTable leads={leads} />
          </div>
        </main>
      </div>
    </div>
  );
}
