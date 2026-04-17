import { createClient, type Session } from '@supabase/supabase-js';

let browserClient: ReturnType<typeof createClient> | null = null;

function getSupabaseEnv() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error('Supabase environment variables are missing.');
    }

    return { url, anonKey };
}

export function getSupabaseBrowserClient() {
    if (!browserClient) {
        const { url, anonKey } = getSupabaseEnv();
        browserClient = createClient(url, anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            },
        });
    }

    return browserClient;
}

export async function getBrowserSession(): Promise<Session | null> {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
}
