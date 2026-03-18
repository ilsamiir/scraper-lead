"use client";

import { ExternalLink, Search, Download, Save } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from '@/utils/supabase/client';

type Lead = {
    id?: string;
    business_name?: string;
    keyword?: string;
    city?: string;
    province?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    google_maps_url?: string;
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof Lead, direction: 'asc' | 'desc' } | null>(null);
    const [selectedLeads, setSelectedLeads] = useState<Set<Lead>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    if (!leads || leads.length === 0) {
        return (
            <div className="w-full glass-panel p-8 min-h-[400px] flex flex-col items-center justify-center text-center border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-medium text-white/80">In attesa di istruzioni</h3>
                <p className="text-white/40 mt-2 max-w-sm">
                    Inserisci i parametri di ricerca qui sopra per estrarre e popolare i tuoi contatti.
                </p>
            </div>
        );
    }

    const sortedLeads = [...leads];
    if (sortConfig !== null) {
        sortedLeads.sort((a, b) => {
            const aValue = a[sortConfig.key] ?? "";
            const bValue = b[sortConfig.key] ?? "";
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const requestSort = (key: keyof Lead) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleSelect = (lead: Lead) => {
        const newSelected = new Set(selectedLeads);
        if (newSelected.has(lead)) {
            newSelected.delete(lead);
        } else {
            newSelected.add(lead);
        }
        setSelectedLeads(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedLeads.size === sortedLeads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(sortedLeads));
        }
    };

    const handleExportExcel = () => {
        if (selectedLeads.size === 0) return;

        const dataToExport = Array.from(selectedLeads).map((lead) => ({
            'Nome Azienda': lead.business_name || '',
            'Keyword': lead.keyword || '',
            'Città': lead.city || '',
            'Provincia': lead.province || '',
            'Indirizzo': lead.address || '',
            'Telefono': lead.phone || '',
            'Email': lead.email || '',
            'Sito Web': lead.website || '',
            'Google Maps': lead.google_maps_url || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Contatti");
        XLSX.writeFile(workbook, "contatti_selezionati.xlsx");
    };

    const handleSaveClients = async () => {
        if (selectedLeads.size === 0) return;
        setIsSaving(true);

        const leadsToSave = Array.from(selectedLeads).map((lead) => ({
            business_name: lead.business_name || '',
            keyword: lead.keyword || '',
            city: lead.city || '',
            province: lead.province || '',
            address: lead.address || '',
            phone: lead.phone || '',
            website: lead.website || '',
            google_maps_url: lead.google_maps_url || '',
            email: lead.email || '',
            status: 'Da contattare'
        }));

        const { error } = await supabase.from('saved_clients').insert(leadsToSave);

        setIsSaving(false);

        if (error) {
            alert('Errore durante il salvataggio dei clienti: ' + error.message);
        } else {
            alert('Clienti salvati con successo nel CRM!');
            setSelectedLeads(new Set());
        }
    };

    return (
        <div className="w-full glass-panel overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-white/70 text-sm font-medium">
                        {selectedLeads.size > 0 ? `${selectedLeads.size} contatti selezionati` : 'Nessun contatto selezionato'}
                    </span>
                    {selectedLeads.size > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSaveClients}
                                disabled={isSaving}
                                className="bg-brand-accent text-white hover:opacity-90 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" /> {isSaving ? 'Salvataggio...' : 'Salva nel CRM'}
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="bg-brand-gradient-1 text-white hover:opacity-90 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Download className="w-4 h-4" /> Scarica Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white/5 border-b border-white/10 text-white/60">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer accent-brand-gradient-1"
                                    checked={selectedLeads.size === sortedLeads.length && sortedLeads.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('business_name')}>Nome Azienda</th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('keyword')}>Keyword</th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('city')}>Città</th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('province')}>Provincia</th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('address')}>Indirizzo</th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('phone')}>Telefono</th>
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => requestSort('email')}>Email</th>
                            <th className="px-6 py-4 font-medium">Link</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {sortedLeads.map((lead, idx) => (
                            <tr key={lead.id || idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer accent-brand-gradient-1"
                                        checked={selectedLeads.has(lead)}
                                        onChange={() => toggleSelect(lead)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-white font-medium">{lead.business_name}</td>
                                <td className="px-6 py-4 text-white/70">{lead.keyword || '-'}</td>
                                <td className="px-6 py-4 text-white/70">{lead.city || '-'}</td>
                                <td className="px-6 py-4 text-white/70">{lead.province || '-'}</td>
                                <td className="px-6 py-4 text-white/70 truncate max-w-[200px]" title={lead.address}>{lead.address || '-'}</td>
                                <td className="px-6 py-4 text-white/70">{lead.phone || '-'}</td>
                                <td className="px-6 py-4 text-white/70">{lead.email || '-'}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    {lead.website && (
                                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-brand-gradient-1 hover:text-brand-gradient-1/80 flex items-center gap-1">Web <ExternalLink className="w-3 h-3" /></a>
                                    )}
                                    {lead.google_maps_url && (
                                        <a href={lead.google_maps_url} target="_blank" rel="noreferrer" className="text-brand-accent hover:text-brand-accent/80 flex items-center gap-1">Maps <ExternalLink className="w-3 h-3" /></a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-white/10 flex items-center justify-between text-white/50 text-xs">
                <span>Mostrando {leads.length} contatti</span>
            </div>
        </div>
    );
}
