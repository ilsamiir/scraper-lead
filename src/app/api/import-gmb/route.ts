import { NextResponse } from 'next/server';

type PlaceDetailsResponse = {
    result?: {
        name?: string;
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        url?: string;
        address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
        }>;
    };
    status: string;
};

export async function POST(req: Request) {
    try {
        const { gmbUrl } = await req.json();

        if (!gmbUrl) {
            return NextResponse.json({ error: 'GMB URL is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
        }

        // Extract Place ID from URL if possible
        // Common formats:
        // https://www.google.com/maps/place/Business+Name/@lat,lng,zoom/data=!3m1!4b1!4m6!3m5!1sPLACE_ID...
        // https://maps.app.goo.gl/SHORT_URL
        
        let placeId = '';
        
        // Handle maps.app.goo.gl shortened URLs by chasing the redirect
        if (gmbUrl.includes('maps.app.goo.gl')) {
            const redirectRes = await fetch(gmbUrl, { method: 'HEAD', redirect: 'follow' });
            const longUrl = redirectRes.url;
            placeId = extractPlaceId(longUrl);
        } else {
            placeId = extractPlaceId(gmbUrl);
        }

        if (!placeId) {
            // If Place ID extraction fails, we might need to search by name/address if URL contains them
            // For now, let's try to search by the name in the URL if place ID is missing
            const nameFromUrl = extractNameFromUrl(gmbUrl);
            if (nameFromUrl) {
                const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
                searchUrl.searchParams.append('input', nameFromUrl);
                searchUrl.searchParams.append('inputtype', 'textquery');
                searchUrl.searchParams.append('fields', 'place_id');
                searchUrl.searchParams.append('key', apiKey);
                
                const searchRes = await fetch(searchUrl.toString());
                const searchData = await searchRes.json();
                
                if (searchData.candidates && searchData.candidates.length > 0) {
                    placeId = searchData.candidates[0].place_id;
                }
            }
        }

        if (!placeId) {
            return NextResponse.json({ error: 'Could not extract Place ID from URL' }, { status: 400 });
        }

        // Fetch Place Details
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.append('place_id', placeId);
        detailsUrl.searchParams.append('fields', 'name,formatted_address,formatted_phone_number,website,url,address_components');
        detailsUrl.searchParams.append('key', apiKey);
        detailsUrl.searchParams.append('language', 'it');

        const detailsRes = await fetch(detailsUrl.toString());
        const detailsData = (await detailsRes.json()) as PlaceDetailsResponse;

        if (detailsData.status !== 'OK' || !detailsData.result) {
            return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 400 });
        }

        const res = detailsData.result;
        
        // Extract city and province
        let city = '';
        let province = '';
        
        if (res.address_components) {
            const cityComp = res.address_components.find(c => c.types.includes('locality'));
            const provinceComp = res.address_components.find(c => c.types.includes('administrative_area_level_2'));
            
            if (cityComp) city = cityComp.long_name;
            if (provinceComp) province = provinceComp.short_name;
        }

        return NextResponse.json({
            business_name: res.name,
            address: res.formatted_address,
            phone: res.formatted_phone_number,
            website: res.website,
            google_maps_url: res.url,
            city,
            province
        });

    } catch (error) {
        console.error('Error importing client from GMB:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function extractPlaceId(url: string): string {
    // Try to find !1sPLACE_ID!2s pattern
    const match = url.match(/!1s(0x[a-f0-9]+:[a-f0-9]+)/i);
    if (match) return match[1];
    
    // Try to find ftid parameter
    const urlObj = new URL(url);
    const ftid = urlObj.searchParams.get('ftid');
    if (ftid) return ftid;

    return '';
}

function extractNameFromUrl(url: string): string {
    try {
        const decoded = decodeURIComponent(url);
        const match = decoded.match(/\/place\/([^\/@]+)/);
        if (match) return match[1].replace(/\+/g, ' ');
    } catch (e) {}
    return '';
}
