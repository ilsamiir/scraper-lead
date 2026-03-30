// @ts-expect-error - Deno runtime import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno runtime import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
    env: {
        get(key: string): string | undefined;
    };
};

const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

serve(async (req: Request) => {
    // Parse Webhook payload
    let payload;
    try {
        payload = await req.json();
    } catch (error) {
        console.error("Invalid custom payload format.", error);
        return new Response("Invalid custom payload format.", { status: 400 });
    }

    const lead = payload.record; // Passed via Database Webhook AFTER INSERT

    if (!lead || !lead.website) {
        return new Response("Skipped: No website provided", { status: 200 });
    }

    const supabaseUrl = Deno.env.get('MY_SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase environment variables");
        return new Response("Server Misconfiguration", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log(`Scraping website: ${lead.website}`);

        // Attempt standard GET request imitating a browser
        const response = await fetch(lead.website, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = await response.text();
        const matches = html.match(emailRegex);
        let extractedEmail = null;

        if (matches) {
            // Advanced Regex to avoid matching static assets or css references
            const validEmails = matches.filter(e => !e.match(/\.(png|jpe?g|gif|webp|css|js|svg)$/i));
            if (validEmails.length > 0) {
                extractedEmail = Array.from(new Set(validEmails))[0].toLowerCase();
            }
        }

        // Update Lead Record asynchronously 
        console.log(`Updating lead ${lead.id} with email ${extractedEmail}`);
        await supabase.from('leads')
            .update({
                email: extractedEmail,
                updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

        return new Response(JSON.stringify({ success: true, email: extractedEmail }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(`Edge function failed or timeout evaluating ${lead.website}`, error);
        await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id);
        return new Response("Scraping execution failed", { status: 500 });
    }
});
