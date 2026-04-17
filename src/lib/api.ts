import { getCurrentBrowserSession } from './browserAuth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function toApiUrl(input: string) {
    if (/^https?:\/\//i.test(input)) {
        return input;
    }

    if (!API_BASE_URL) {
        return input;
    }

    return `${API_BASE_URL}${input.startsWith('/') ? input : `/${input}`}`;
}

async function buildHeaders(initHeaders?: HeadersInit) {
    const headers = new Headers(initHeaders);
    const session = await getCurrentBrowserSession();

    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    return headers;
}

export async function apiFetch(input: string, init: RequestInit = {}) {
    const headers = await buildHeaders(init.headers);

    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(toApiUrl(input), {
        ...init,
        headers,
    });
}

export async function apiFetchJson<T>(input: string, init: RequestInit = {}): Promise<T> {
    const response = await apiFetch(input, init);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
    }

    return data as T;
}
