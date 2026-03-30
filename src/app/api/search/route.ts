import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SerpPlace = {
    title?: string;
    address?: string;
    phone?: string;
    links?: {
        website?: string;
        directions?: string;
    };
};

type SerpApiResponse = {
    local_results?: SerpPlace[];
};

type AddressComponent = {
    short_name: string;
    types: string[];
};

type GeocodeResult = {
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    address_components?: AddressComponent[];
};

type GeocodeResponse = {
    status: string;
    results: GeocodeResult[];
};

type SearchBody = {
    keyword?: string;
    location?: string;
};

// Fetch one page of results from SerpAPI google_local engine
async function fetchSerpPage(keyword: string, location: string, serpApiKey: string, start: number = 0) {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.append("engine", "google_local");
    url.searchParams.append("q", `${keyword} ${location}`);
    url.searchParams.append("gl", "it");
    url.searchParams.append("hl", "it");
    url.searchParams.append("start", String(start));
    url.searchParams.append("api_key", serpApiKey);

    const res = await fetch(url.toString());
    const data = (await res.json()) as SerpApiResponse;

    if (!res.ok) {
        console.error(`SerpAPI Error (start=${start}):`, data);
        return [];
    }

    return data.local_results || [];
}

// Fetch one page using coordinates (lat,lng) to cover a wider area
async function fetchSerpPageByCoords(keyword: string, lat: number, lng: number, serpApiKey: string, start: number = 0) {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.append("engine", "google_local");
    url.searchParams.append("q", keyword);
    url.searchParams.append("ll", `@${lat},${lng},14z`); // zoom 14 = ~10-15km radius (comuni limitrofi)
    url.searchParams.append("gl", "it");
    url.searchParams.append("hl", "it");
    url.searchParams.append("start", String(start));
    url.searchParams.append("api_key", serpApiKey);

    const res = await fetch(url.toString());
    const data = (await res.json()) as SerpApiResponse;

    if (!res.ok) {
        console.error(`SerpAPI (coords) Error (start=${start}):`, data);
        return [];
    }

    return data.local_results || [];
}

// Geocode location string to lat/lng + province code using Google Maps Geocoding API
async function geocodeLocation(location: string, googleApiKey: string): Promise<{ lat: number; lng: number; province: string | null } | null> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.append("address", location);
    url.searchParams.append("key", googleApiKey);
    url.searchParams.append("language", "it");
    url.searchParams.append("region", "it");

    try {
        const res = await fetch(url.toString());
        const data = (await res.json()) as GeocodeResponse;
        if (data.status === "OK" && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            // Extract short province code from address_components
            const components = data.results[0].address_components || [];
            const provinceComp = components.find((component) => component.types.includes("administrative_area_level_2"));
            // short_name is the 2-letter Italian province code (e.g. "MC")
            const province = provinceComp?.short_name ?? null;
            console.log(`Geocoded "${location}" → lat:${lat}, lng:${lng}, province:${province}`);
            return { lat, lng, province };
        }
    } catch (e) {
        console.error("Geocoding failed:", e);
    }
    return null;
}

// Filter raw SerpAPI results to only keep entries matching the target province
function filterByProvince(results: SerpPlace[], targetProvince: string): SerpPlace[] {
    return results.filter(place => {
        if (!place.address) return true; // keep if no address to check
        const match = place.address.match(/\b\d{5}\s+[A-Za-z\u00C0-\u017F\s'-]+\s+([A-Z]{2})\b/);
        if (!match) return true; // keep if we can't parse province
        return match[1] === targetProvince;
    });
}

// Deduplicate results by business_name + address
function deduplicateResults(results: SerpPlace[]): SerpPlace[] {
    const seen = new Set<string>();
    return results.filter((result) => {
        const key = `${(result.title || '').toLowerCase().trim()}|${(result.address || '').toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function mapPlaceToLead(place: SerpPlace, keyword: string, location: string) {
    let city = null;
    let province = null;

    if (place.address) {
        const addressMatch = place.address.match(/\b\d{5}\s+([A-Za-z\u00C0-\u017F\s'-]+)\s+([A-Z]{2})\b/);
        if (addressMatch) {
            city = addressMatch[1].trim();
            province = addressMatch[2].trim();
        } else {
            city = location.split(' ')[0] || null;
        }
    }

    return {
        search_keyword: keyword,
        search_location: location,
        keyword: keyword,
        business_name: place.title ?? 'Unknown Name',
        address: place.address ?? null,
        city: city,
        province: province,
        phone: place.phone ?? null,
        website: place.links?.website ?? null,
        google_maps_url: place.links?.directions || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((place.title || '') + ' ' + (place.address || ''))}`
    };
}

export async function POST(req: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serpApiKey = process.env.SERPAPI_API_KEY;
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!supabaseUrl || !supabaseKey || !serpApiKey) {
        return NextResponse.json({ error: 'Server is missing required environment variables.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const body = await req.json();
        const { keyword, location } = body as SearchBody;

        if (!keyword || !location) {
            return NextResponse.json({ error: 'Keyword and location are required.' }, { status: 400 });
        }

        console.log(`Searching SerpAPI for: "${keyword}" in "${location}" (with nearby cities)`);

        // --- Strategy 1: Search by name (page 0 + page 20) ---
        const [page0, page20] = await Promise.all([
            fetchSerpPage(keyword, location, serpApiKey, 0),
            fetchSerpPage(keyword, location, serpApiKey, 20),
        ]);

        let allRawResults = [...page0, ...page20];

        // --- Strategy 2: Geocode + coordinate search + province filtering ---
        let targetProvince: string | null = null;
        if (googleApiKey) {
            const coords = await geocodeLocation(location, googleApiKey);
            if (coords) {
                targetProvince = coords.province;
                const [coordsPage0, coordsPage20] = await Promise.all([
                    fetchSerpPageByCoords(keyword, coords.lat, coords.lng, serpApiKey, 0),
                    fetchSerpPageByCoords(keyword, coords.lat, coords.lng, serpApiKey, 20),
                ]);
                allRawResults = [...allRawResults, ...coordsPage0, ...coordsPage20];
            }
        }

        // Filter by province to exclude distant cities (e.g. Rome when searching Macerata)
        let filteredResults = allRawResults;
        if (targetProvince) {
            filteredResults = filterByProvince(allRawResults, targetProvince);
            console.log(`Province filter (${targetProvince}): ${allRawResults.length} → ${filteredResults.length} results`);
        }

        // Deduplicate before processing
        const uniqueRaw = deduplicateResults(filteredResults);
        console.log(`Total unique results after dedup: ${uniqueRaw.length}`);

        if (uniqueRaw.length === 0) {
            return NextResponse.json({ results: [], message: "Nessun risultato trovato." });
        }

        // Map to lead schema
        const leads = uniqueRaw.map((place) => mapPlaceToLead(place, keyword, location));

        // Bulk upsert to Supabase
        const { data: inserted, error } = await supabase
            .from('leads')
            .upsert(leads, { onConflict: 'business_name,address', ignoreDuplicates: true })
            .select();

        if (error) {
            console.error("Supabase Insert Error:", error);
            return NextResponse.json({ error: 'Failed to insert leads into database.' }, { status: 500 });
        }

        const finalResults = (inserted && inserted.length > 0) ? inserted : leads;

        return NextResponse.json({
            success: true,
            count: leads.length,
            insertedCount: inserted ? inserted.length : 0,
            results: finalResults
        });

    } catch (error: unknown) {
        console.error("Search API Route Error:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
