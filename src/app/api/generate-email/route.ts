import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type EmailGenerationPayload = {
    subject: string;
    body: string;
};

class EmailGenerationError extends Error {
    code: string;
    status: number;
    userMessage: string;

    constructor(code: string, userMessage: string, status = 500, message?: string) {
        super(message ?? userMessage);
        this.code = code;
        this.status = status;
        this.userMessage = userMessage;
    }
}

const extractJsonObject = (rawContent: string) => {
    const trimmed = rawContent.trim();
    const withoutFence = trimmed
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new EmailGenerationError(
            'INVALID_AI_RESPONSE',
            'L\'AI ha restituito una risposta non valida. Riprova tra qualche minuto.',
            502,
            'No JSON object found in AI response'
        );
    }

    return withoutFence.slice(firstBrace, lastBrace + 1);
};

const parseEmailGenerationPayload = (content: unknown): EmailGenerationPayload => {
    if (typeof content !== 'string' || content.trim().length === 0) {
        throw new EmailGenerationError(
            'INVALID_AI_RESPONSE',
            'L\'AI non ha restituito un contenuto utilizzabile. Riprova tra qualche minuto.',
            502,
            'AI response content is empty or not a string'
        );
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(extractJsonObject(content));
    } catch (error) {
        if (error instanceof EmailGenerationError) {
            throw error;
        }

        throw new EmailGenerationError(
            'INVALID_AI_RESPONSE',
            'L\'AI ha restituito un formato inatteso. Riprova tra qualche minuto.',
            502,
            error instanceof Error ? error.message : 'Unable to parse AI response'
        );
    }

    const subject = typeof (parsed as { subject?: unknown }).subject === 'string'
        ? (parsed as { subject: string }).subject.trim()
        : '';
    const body = typeof (parsed as { body?: unknown }).body === 'string'
        ? (parsed as { body: string }).body.trim()
        : '';

    if (!subject || !body) {
        throw new EmailGenerationError(
            'INVALID_AI_RESPONSE',
            'L\'AI non ha generato oggetto e messaggio completi. Riprova tra qualche minuto.',
            502,
            'AI response payload is missing subject or body'
        );
    }

    return { subject, body };
};

export async function POST(request: Request) {
    try {
        const { clientName, website, notes } = await request.json();

        if (!process.env.OPENROUTER_API_KEY) {
            throw new EmailGenerationError(
                'OPENROUTER_NOT_CONFIGURED',
                'La generazione email AI non e disponibile al momento. Configura OPENROUTER_API_KEY sul deploy live.',
                500
            );
        }

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
            throw new EmailGenerationError(
                'OPENROUTER_REQUEST_FAILED',
                'Il provider AI non e riuscito a generare l\'email. Riprova tra qualche minuto.',
                502,
                `OpenRouter API error: HTTP ${response.status}`
            );
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        
        console.log("Raw LLM Response:", content);

        const parsed = parseEmailGenerationPayload(content);

        return NextResponse.json(parsed);
    } catch (error: unknown) {
        if (error instanceof EmailGenerationError) {
            console.error('Error generating email:', error.code, error.message);
            return NextResponse.json(
                { error: error.userMessage, code: error.code },
                { status: error.status }
            );
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error generating email:', message);
        return NextResponse.json(
            {
                error: 'Si e verificato un errore durante la generazione dell\'email.',
                code: 'EMAIL_GENERATION_FAILED',
            },
            { status: 500 }
        );
    }
}
