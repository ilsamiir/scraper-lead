"use client";

import { useState } from "react";
import { Search, MapPin, Sparkles } from "lucide-react";
import Autocomplete from "react-google-autocomplete";

type PlaceResult = {
    formatted_address?: string;
    name?: string;
};

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
                    <Search className="absolute left-4 w-5 h-5 text-brand-muted" />
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="es. Dentisti"
                        className="w-full bg-transparent border-none focus:ring-0 text-brand-text placeholder:text-brand-muted pl-12 pr-4 py-3 outline-none"
                        required
                        disabled={loading}
                    />
                </div>
                <div className="hidden sm:block w-px h-8 bg-brand-border my-auto" />
                <div className="relative flex-1 flex items-center border-t sm:border-t-0 border-brand-border">
                    <MapPin className="absolute left-4 w-5 h-5 text-brand-muted" />
                    <Autocomplete
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                        onPlaceSelected={(place: PlaceResult) => {
                            if (place && (place.formatted_address || place.name)) {
                                setLocation(place.formatted_address || place.name || "");
                            }
                        }}
                        options={{
                            types: ["(cities)"]
                        }}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLocation(event.target.value)}
                        defaultValue={location}
                        placeholder="es. Milano, Italia"
                        className="w-full bg-transparent border-none focus:ring-0 text-brand-text placeholder:text-brand-muted pl-12 pr-4 py-3 outline-none"
                        required
                        disabled={loading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="primary-button m-1 flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50 disabled:hover:-translate-y-0 disabled:hover:shadow-none"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
