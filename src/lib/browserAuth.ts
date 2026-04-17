import type { Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function toApiUrl(pathname: string) {
    if (!API_BASE_URL) {
        return pathname;
    }

    return `${API_BASE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export async function signInWithMagicLink(email: string) {
    try {
        const response = await fetch(toApiUrl('/api/auth/request-link'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const payload = await response.json() as { error?: string };
        if (!response.ok) {
            throw new Error(payload.error || 'Unable to send sign-in link');
        }

        return { error: null };
    } catch (error) {
        return {
            error: {
                message: error instanceof Error ? error.message : 'Unable to send sign-in link',
            },
        };
    }
}

export async function signOutBrowserSession() {
    const supabase = getSupabaseBrowserClient();
    return supabase.auth.signOut();
}

export async function getCurrentBrowserSession(): Promise<Session | null> {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
}

export function subscribeToAuthChanges(callback: (session: Session | null) => void) {
    const supabase = getSupabaseBrowserClient();
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
}
