import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

type EmailGenerationPayload = {
    subject: string;
    body: string;
};

type EmailGenerationRequest = {
    clientName?: string | null;
    website?: string | null;
    notes?: string | null;
    keyword?: string | null;
    city?: string | null;
    province?: string | null;
    address?: string | null;
    phone?: string | null;
    status?: string | null;
    sector?: string | null;
    estimatedRevenue?: string | null;
    employeeCount?: string | null;
    hasWebsite?: boolean | null;
    digitalScore?: number | null;
    lastContactMethod?: string | null;
    lastContactDate?: string | null;
    followUpDate?: string | null;
    googleMapsUrl?: string | null;
    contactCount?: number | null;
};

type WebsiteSnapshot = {
    finalUrl: string;
    title: string;
    metaDescription: string;
    h1: string;
    visibleText: string;
};

const EMAIL_SIGNATURE = [
    'Angelo Giacchetti',
    'Responsabile marketing & sviluppo',
    '+393898982589',
    'angelo@webnovation.it',
    'www.webnovation.it',
    'Via Sambucheto 21/d, Recanati (MC)',
].join('\n');

const GENERIC_SUBJECT_PATTERNS = [
    /proposta/i,
    /collaborazione/i,
    /offerta/i,
    /preventivo/i,
    /informazioni/i,
    /ti scrivo/i,
    /business/i,
    /marketing/i,
];

const normalizeOptionalText = (value?: string | null) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.replace(/\s+/g, ' ').trim();
};

const getDisplayText = (value?: string | null, fallback = 'Non specificato') => {
    const normalized = normalizeOptionalText(value);
    return normalized || fallback;
};

const truncate = (value: string, maxLength: number) => {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const formatDateLabel = (value?: string | null) => {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const toTitleCase = (value: string) =>
    value
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const isSocialProfile = (website?: string | null) => {
    const normalized = normalizeOptionalText(website).toLowerCase();
    return ['facebook', 'instagram', 'linkedin', 'tiktok'].some((platform) => normalized.includes(platform));
};

const normalizeWebsiteUrl = (website?: string | null) => {
    const normalized = normalizeOptionalText(website);
    if (!normalized) {
        return null;
    }

    try {
        return new URL(normalized).toString();
    } catch {
        try {
            return new URL(`https://${normalized}`).toString();
        } catch {
            return null;
        }
    }
};

const fetchWebsiteSnapshot = async (website?: string | null): Promise<WebsiteSnapshot | null> => {
    if (!website || isSocialProfile(website)) {
        return null;
    }

    const normalizedUrl = normalizeWebsiteUrl(website);
    if (!normalizedUrl) {
        return null;
    }

    try {
        const response = await fetch(normalizedUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml',
                'User-Agent': 'Mozilla/5.0 (compatible; WebnovationLeadIntel/1.0; +https://www.webnovation.it)',
            },
            signal: AbortSignal.timeout(2500),
        });

        if (!response.ok) {
            return null;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('text/html')) {
            return null;
        }

        const html = await response.text();
        const $ = load(html);
        $('script, style, noscript, svg').remove();

        const title = truncate(normalizeOptionalText($('title').first().text()), 120);
        const metaDescription = truncate(
            normalizeOptionalText(
                $('meta[name="description"]').attr('content')
                ?? $('meta[property="og:description"]').attr('content')
            ),
            220
        );
        const h1 = truncate(normalizeOptionalText($('h1').first().text()), 120);
        const visibleText = truncate(
            normalizeOptionalText($('main').first().text() || $('body').first().text()),
            320
        );

        return {
            finalUrl: response.url || normalizedUrl,
            title,
            metaDescription,
            h1,
            visibleText,
        };
    } catch (error) {
        console.warn('Could not enrich website context for email generation', error);
        return null;
    }
};

const buildClientContext = (input: EmailGenerationRequest, websiteSnapshot: WebsiteSnapshot | null) => {
    const lines = [
        `- Nome attivita: ${getDisplayText(input.clientName)}`,
        `- Settore principale: ${getDisplayText(input.sector || input.keyword)}`,
        `- Keyword di acquisizione: ${getDisplayText(input.keyword)}`,
        `- Citta: ${getDisplayText(input.city)}`,
        `- Provincia: ${getDisplayText(input.province)}`,
        `- Indirizzo: ${getDisplayText(input.address)}`,
        `- Sito o profilo digitale: ${getDisplayText(input.website)}`,
        `- Telefono pubblico: ${getDisplayText(input.phone)}`,
        `- Stato CRM: ${getDisplayText(input.status)}`,
        `- Ultimo contatto: ${formatDateLabel(input.lastContactDate) || 'Nessun dato'}`,
        `- Metodo ultimo contatto: ${getDisplayText(input.lastContactMethod, 'Non disponibile')}`,
        `- Follow-up previsto: ${formatDateLabel(input.followUpDate) || 'Non pianificato'}`,
        `- Numero contatti registrati: ${typeof input.contactCount === 'number' ? String(input.contactCount) : '0'}`,
        `- Fatturato stimato: ${getDisplayText(input.estimatedRevenue)}`,
        `- Dipendenti stimati: ${getDisplayText(input.employeeCount)}`,
        `- Punteggio digitale interno: ${typeof input.digitalScore === 'number' ? `${input.digitalScore}/100` : 'Non disponibile'}`,
        `- Note operatore: ${getDisplayText(input.notes, 'Nessuna nota')}`,
        `- Link Google Maps: ${getDisplayText(input.googleMapsUrl)}`,
    ];

    if (typeof input.hasWebsite === 'boolean') {
        lines.push(`- Sito proprietario presente: ${input.hasWebsite ? 'Si' : 'No'}`);
    }

    if (websiteSnapshot) {
        lines.push('- Evidenze rilevate sul sito:');
        lines.push(`  - URL finale: ${websiteSnapshot.finalUrl}`);
        lines.push(`  - Title: ${websiteSnapshot.title || 'Non rilevato'}`);
        lines.push(`  - H1 principale: ${websiteSnapshot.h1 || 'Non rilevato'}`);
        lines.push(`  - Meta description: ${websiteSnapshot.metaDescription || 'Non rilevata'}`);
        lines.push(`  - Testo visibile sintetico: ${websiteSnapshot.visibleText || 'Non rilevato'}`);
    }

    return lines.join('\n');
};

const buildOpportunitySignals = (input: EmailGenerationRequest, websiteSnapshot: WebsiteSnapshot | null) => {
    const signals: string[] = [];
    const socialOnly = isSocialProfile(input.website);

    if (socialOnly) {
        signals.push('Il contatto sembra basarsi su un profilo social invece che su un sito proprietario: posizionare il valore su controllo del canale, richieste dirette e autorevolezza locale.');
    }

    if (!normalizeOptionalText(input.website) || input.hasWebsite === false) {
        signals.push('Se manca un sito proprietario, sottolineare il vantaggio di avere una presenza digitale controllata e orientata alla conversione.');
    }

    if (typeof input.digitalScore === 'number' && input.digitalScore <= 45) {
        signals.push('Il punteggio digitale interno e basso: usare un angolo consulenziale, non accusatorio, su visibilita, fiducia e richieste dirette.');
    }

    if (websiteSnapshot?.metaDescription || websiteSnapshot?.title || websiteSnapshot?.h1) {
        signals.push('Usare una sola osservazione specifica ricavata dal sito per evitare un testo percepito come generico o artificiale.');
    }

    if (normalizeOptionalText(input.notes)) {
        signals.push('Integrare solo gli elementi veramente utili dalle note operatore, senza riportarle in modo meccanico.');
    }

    if (typeof input.contactCount === 'number' && input.contactCount > 0) {
        signals.push('Esiste gia uno storico contatti: evitare un tono da primissimo approccio e mantenere continuita commerciale.');
    }

    if (signals.length === 0) {
        signals.push('Con dati limitati, preferire una proposta sobria e credibile basata su una singola opportunita locale plausibile.');
    }

    return signals.map((signal) => `- ${signal}`).join('\n');
};

const buildFallbackSubject = (input: EmailGenerationRequest, socialOnly: boolean) => {
    const city = normalizeOptionalText(input.city);
    const sector = normalizeOptionalText(input.sector || input.keyword);

    if (socialOnly && city) {
        return `Non solo social a ${city}`;
    }

    if (sector && city) {
        return truncate(`${toTitleCase(sector)} a ${city}: piu contatti diretti`, 55);
    }

    if (sector) {
        return truncate(`${toTitleCase(sector)}: piu contatti diretti`, 55);
    }

    if (city) {
        return truncate(`Piu richieste dirette a ${city}`, 55);
    }

    return 'Una proposta concreta per il digitale';
};

const normalizeGeneratedBody = (body: string) => {
    const normalized = body.replace(/\r\n/g, '\n').trim();
    const contentWithoutSignature = normalized.includes('Angelo Giacchetti')
        ? normalized.split('Angelo Giacchetti')[0].trim()
        : normalized;

    return `${contentWithoutSignature}\n\n${EMAIL_SIGNATURE}`.trim();
};

const finalizeEmailPayload = (payload: EmailGenerationPayload, input: EmailGenerationRequest) => {
    const socialOnly = isSocialProfile(input.website);
    const subject = payload.subject
        .replace(/[\r\n]+/g, ' ')
        .replace(/^['"\s]+|['"\s]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const shouldUseFallbackSubject = !subject
        || subject.length > 80
        || GENERIC_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));

    return {
        subject: shouldUseFallbackSubject ? buildFallbackSubject(input, socialOnly) : subject,
        body: normalizeGeneratedBody(payload.body),
    };
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
        const input = await request.json() as EmailGenerationRequest;
        const { website, keyword, city } = input;

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

        const websiteSnapshot = await fetchWebsiteSnapshot(website);

        const systemPrompt = `
Sei un consulente commerciale B2B senior e copywriter per l'agenzia Webnovation.
Scrivi email di primo contatto per PMI locali in italiano.

Stile obbligatorio:
- professionale, cortese, credibile e concreto
- usare il registro di cortesia (Lei) o una formula neutra professionale
- evitare tono informale, slang, eccessiva confidenza, frasi da venditore aggressivo, punti esclamativi ed emoji
- evitare frasi vaghe o generiche: ogni email deve sembrare scritta per quel contatto specifico
- non inventare dati che non emergono dal contesto
`;

        const prompt = `
Contesto agenzia:
${brandIdentity}

Obiettivo:
Scrivere un'email di primo contatto per proporre una breve call conoscitiva a un potenziale cliente locale.

Scheda cliente:
${buildClientContext(input, websiteSnapshot)}

Indicazioni strategiche:
${buildOpportunitySignals(input, websiteSnapshot)}

Indicazioni sul corpo email:
- massimo 90 parole, esclusa la firma
- 2 paragrafi brevi, scorrevoli, senza elenchi puntati
- apertura professionale, non confidenziale
- citare una sola osservazione specifica o opportunita concreta
- collegare l'osservazione a un impatto business comprensibile per il cliente
- chiudere con una CTA leggera per una call di 10 minuti o un rapido confronto telefonico
- se i dati sono insufficienti, essere prudenti e non inventare dettagli
- se il contatto usa solo social, valorizzare il tema del canale proprietario senza risultare giudicanti

Indicazioni sull'oggetto:
- deve distinguersi nella inbox senza sembrare spam
- massimo 6 parole e massimo 55 caratteri
- sobrio, concreto, specifico
- evitare formule generiche come "Proposta di collaborazione", "Offerta", "Preventivo", "Informazioni" o simili
- evitare TUTTO MAIUSCOLO, clickbait, punti esclamativi e formule troppo commerciali
- pensa internamente ad almeno 3 opzioni e restituisci solo la migliore

Vincoli obbligatori:
1. L'email e scritta e inviata da Angelo Giacchetti.
2. Non usare tono informale, non dare del tu e non usare slang.
3. Il settore di riferimento e ${keyword || 'non specificato'} e l'area principale e ${city || 'non specificata'}: sfrutta questi dati solo se utili e credibili.
4. L'email deve concludersi con questa firma ESATTA, rispettando gli a capo:

${EMAIL_SIGNATURE}

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
                temperature: 0.4,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
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

        const parsed = finalizeEmailPayload(parseEmailGenerationPayload(content), input);

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
