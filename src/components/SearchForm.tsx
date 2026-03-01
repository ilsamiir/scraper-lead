"use client";

import { useState } from "react";
import { Search, MapPin, Sparkles } from "lucide-react";
import Autocomplete from "react-google-autocomplete";

export function SearchForm({ onSearch }: { onSearch: (keyword: string, location: string) => void }) {
    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword || !location) return;
        setLoading(true);
        await onSearch(keyword, location);
        setLoading(false);
    };

    return (
        <div className="w-full max-w-2xl mt-8 glass-panel p-2">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 relative z-20">
                <div className="relative flex-1 flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-white/40" />
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="es. Dentisti"
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-white/40 pl-12 pr-4 py-3 outline-none"
                        required
                        disabled={loading}
                    />
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/10 my-auto" />
                <div className="relative flex-1 flex items-center border-t sm:border-t-0 border-white/10">
                    <MapPin className="absolute left-4 w-5 h-5 text-white/40" />
                    <Autocomplete
                        // @ts-ignore
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                        onPlaceSelected={(place: any) => {
                            if (place && (place.formatted_address || place.name)) {
                                setLocation(place.formatted_address || place.name);
                            }
                        }}
                        options={{
                            types: ["(cities)"]
                        }}
                        onChange={(e: any) => setLocation(e.target.value)}
                        defaultValue={location}
                        placeholder="es. Milano, Italia"
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-white/40 pl-12 pr-4 py-3 outline-none"
                        required
                        disabled={loading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-white text-black font-medium px-8 py-3 rounded-xl hover:bg-white/90 transition-all active:scale-95 flex items-center justify-center gap-2 m-1 disabled:opacity-50 disabled:active:scale-100 min-w-[140px]"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Cerca
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
