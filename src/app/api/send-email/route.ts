import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { logEmailHistory } from '@/lib/email-history';

type SendEmailRequestBody = {
    clientId?: string;
    to?: string;
    subject?: string;
    body?: string;
    source?: 'manual' | 'cron';
};

export async function POST(request: Request) {
    let payload: SendEmailRequestBody | null = null;

    try {
        const resendApiKey = process.env.RESEND_API_KEY;
        payload = await request.json();
        const { clientId, to, subject, body } = payload;
        const source = payload.source === 'cron' ? 'cron' : 'manual';

        if (!clientId || !to || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!resendApiKey) {
            return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
        }

        const resend = new Resend(resendApiKey);

        const { data, error } = await resend.emails.send({
            from: 'Angelo <angelo@webnovation.it>',
            to: [to],
            subject: subject,
            text: body,
        });

        if (error) {
            try {
                await logEmailHistory({
                    clientId,
                    recipientEmail: to,
                    subject,
                    body,
                    source,
                    status: 'failed',
                    errorMessage: typeof error.message === 'string' ? error.message : JSON.stringify(error),
                });
            } catch (historyError) {
                console.error('Error logging failed email:', historyError);
            }

            return NextResponse.json({ error }, { status: 400 });
        }

        let sentAt = new Date().toISOString();
        let historyLogged = true;

        try {
            const historyResult = await logEmailHistory({
                clientId,
                recipientEmail: to,
                subject,
                body,
                source,
                status: 'sent',
                providerMessageId: typeof data?.id === 'string' ? data.id : null,
            });

            sentAt = historyResult.sentAt;
        } catch (historyError) {
            historyLogged = false;
            console.error('Error logging sent email:', historyError);
        }

        return NextResponse.json({ success: true, data, sentAt, historyLogged });
    } catch (error: unknown) {
        console.error('Error sending email:', error);

        if (payload?.clientId && payload?.to && payload?.subject && payload?.body) {
            try {
                await logEmailHistory({
                    clientId: payload.clientId,
                    recipientEmail: payload.to,
                    subject: payload.subject,
                    body: payload.body,
                    source: payload.source === 'cron' ? 'cron' : 'manual',
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                });
            } catch (historyError) {
                console.error('Error logging unexpected email failure:', historyError);
            }
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
