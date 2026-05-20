import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { clientName, website, notes } = await request.json();

        // Read brand identity
        const brandIdentityPath = path.join(process.cwd(), 'public', 'brand_identity.md');
        let brandIdentity = '';
        try {
            brandIdentity = fs.readFileSync(brandIdentityPath, 'utf-8');
            brandIdentity = brandIdentity.replace(/Saks Agency/g, 'Webnovation');
        } catch (e) {
            console.warn('Could not read brand_identity.md', e);
        }

        const prompt = `
Sei un esperto copywriter B2B per l'agenzia "Webnovation".
Ecco le informazioni sull'agenzia:
${brandIdentity}

Devi scrivere un'email a freddo (cold email) per un potenziale cliente.
Dettagli del cliente:
- Nome: ${clientName || 'Non specificato'}
- Sito web: ${website || 'Non specificato'}
- Note aggiuntive: ${notes || 'Nessuna'}

L'email deve essere:
- Breve, diretta e professionale ma non troppo formale.
- Focalizzata sul valore che Webnovation può portare al cliente.
- Scritta in italiano.

Regole fondamentali da rispettare:
1. L'email è scritta e inviata da Angelo Giacchetti. Non inventare altri mittenti.
2. L'obiettivo e la Call to Action devono essere chiaramente quelli di chiedere un contatto telefonico o un appuntamento conoscitivo.
3. L'email DEVE concludersi con questa ESATTA firma (rispettando gli a capo):

Angelo Giacchetti
Responsabile marketing & sviluppo
+393898982589
angelo@webnovation.it
www.webnovation.it
Via Sambucheto 21/d, Recanati (MC)

Restituisci ESATTAMENTE un oggetto JSON con questa struttura, senza markdown o testo aggiuntivo:
{
    "subject": "Oggetto dell'email",
    "body": "Corpo dell'email (usa \\n per gli a capo e includi la firma alla fine)"
}
`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Status: ${response.status}, Error: ${errorText}`);
            throw new Error(`OpenRouter API error: HTTP ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        
        console.log("Raw LLM Response:", content);

        // Strip markdown backticks if present
        if (content.startsWith('```json')) {
            content = content.substring(7);
        } else if (content.startsWith('```')) {
            content = content.substring(3);
        }
        if (content.endsWith('```')) {
            content = content.substring(0, content.length - 3);
        }
        
        const parsed = JSON.parse(content.trim());

        return NextResponse.json(parsed);
    } catch (error: any) {
        console.error('Error generating email:', error.message || error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
