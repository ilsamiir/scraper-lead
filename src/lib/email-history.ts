import { createClient } from "@supabase/supabase-js";
import type { EmailHistorySource, EmailHistoryStatus } from "@/lib/types";

type LogEmailHistoryParams = {
    clientId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status: EmailHistoryStatus;
    source: EmailHistorySource;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: string;
};

const getSupabaseAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase admin credentials are not configured.");
    }

    return createClient(supabaseUrl, serviceRoleKey);
};

export async function logEmailHistory({
    clientId,
    recipientEmail,
    subject,
    body,
    status,
    source,
    providerMessageId,
    errorMessage,
    sentAt,
}: LogEmailHistoryParams) {
    const supabaseAdmin = getSupabaseAdminClient();
    const occurredAt = sentAt ?? new Date().toISOString();

    const { error: emailHistoryError } = await supabaseAdmin.from("email_history").insert([
        {
            client_id: clientId,
            recipient_email: recipientEmail,
            subject,
            body,
            provider_message_id: providerMessageId ?? null,
            status,
            source,
            sent_at: occurredAt,
            error_message: errorMessage ?? null,
        },
    ]);

    if (emailHistoryError) {
        throw new Error(`Unable to write email history: ${emailHistoryError.message}`);
    }

    if (status !== "sent") {
        return { sentAt: occurredAt };
    }

    const { error: clientUpdateError } = await supabaseAdmin
        .from("saved_clients")
        .update({
            last_contact_method: "email",
            last_contact_date: occurredAt,
        })
        .eq("id", clientId);

    if (clientUpdateError) {
        throw new Error(`Unable to update client last contact: ${clientUpdateError.message}`);
    }

    const { error: contactHistoryError } = await supabaseAdmin.from("contact_history").insert([
        {
            client_id: clientId,
            contact_method: "email",
            contact_date: occurredAt,
            notes: source === "cron"
                ? "Follow-up automatico inviato via cron"
                : "Email inviata dal board clienti.",
        },
    ]);

    if (contactHistoryError) {
        throw new Error(`Unable to write contact history: ${contactHistoryError.message}`);
    }

    return { sentAt: occurredAt };
}