import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Create a Resend client
// If RESEND_API_KEY is not set, we'll handle it gracefully
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

// Supabase client with admin privileges to bypass RLS for the background job
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
    // 1. Verify Vercel Cron Secret (Security)
    // Vercel sends `Authorization: Bearer CRON_SECRET`
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Query today's follow-ups from Supabase
        const todayStr = new Date().toISOString().split('T')[0];

        const { data: clients, error: selectError } = await supabaseAdmin
            .from('saved_clients')
            .select('*')
            .eq('follow_up_date', todayStr);

        if (selectError) {
            console.error('Error fetching clients:', selectError);
            return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
        }

        if (!clients || clients.length === 0) {
            return NextResponse.json({ message: 'No follow-ups for today' });
        }

        // 3. Send emails
        const emailResults = [];
        for (const client of clients) {
            // Compose email content
            const subject = `Promemoria follow up - ${client.business_name || 'Azienda'}`;
            const lastContactDate = client.last_contact_date
                ? new Date(client.last_contact_date).toLocaleDateString('it-IT')
                : 'N/D';

            const emailHtml = `
        <h2>Promemoria Follow-Up</h2>
        <p>È stato programmato un follow-up per oggi per il seguente cliente:</p>
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <th align="left" style="background: #f4f4f4;">Azienda</th>
            <td>${client.business_name || 'N/D'}</td>
          </tr>
          <tr>
            <th align="left" style="background: #f4f4f4;">Indirizzo</th>
            <td>${client.address || 'N/D'}</td>
          </tr>
          <tr>
            <th align="left" style="background: #f4f4f4;">Località</th>
            <td>${client.city || 'N/D'} (${client.province || 'N/D'})</td>
          </tr>
          <tr>
            <th align="left" style="background: #f4f4f4;">Ultimo contatto</th>
            <td>${lastContactDate}</td>
          </tr>
          <tr>
            <th align="left" style="background: #f4f4f4;">Tipo ultimo contatto</th>
            <td>${client.last_contact_method || 'N/D'}</td>
          </tr>
          <tr>
            <th align="left" style="background: #f4f4f4;">Note</th>
            <td>${client.notes || 'Nessuna nota'}</td>
          </tr>
        </table>
        <br/>
        <p>Telefono: ${client.phone || 'N/D'}</p>
        <p>Email: ${client.email || 'N/D'}</p>
        ${client.website ? `<p>Sito Web: <a href="${client.website}">${client.website}</a></p>` : ''}
      `;

            // Note: testing purposes domain works for Resend standard
            const { data, error } = await resend.emails.send({
                from: 'Acquisition Team <onboarding@resend.dev>',
                to: ['commerciale@saksagency.it'],
                subject,
                html: emailHtml,
            });

            if (error) {
                console.error(`Failed to send email for ${client.business_name}:`, error);
                emailResults.push({ client: client.id, status: 'error', error });
            } else {
                emailResults.push({ client: client.id, status: 'sent', data });
            }
        }

        return NextResponse.json({
            message: `Processed ${clients.length} follow-ups`,
            results: emailResults,
        });
    } catch (error: unknown) {
        console.error('Unhandled error in cron job:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
