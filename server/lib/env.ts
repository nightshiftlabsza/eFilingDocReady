import 'dotenv/config';

function getEnv(name: string, fallback?: string) {
    const value = process.env[name] ?? fallback;

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function normalizeAppEnvironment(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return normalized || 'development';
}

const frontendAppUrl = getEnv('FRONTEND_APP_URL', 'http://localhost:3000');

export const env = {
    appEnv: normalizeAppEnvironment(process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development'),
    frontendAppUrl,
    port: Number(process.env.PORT || 3000),
    databaseUrl: getEnv('DATABASE_URL'),
    paystackSecretKey: getEnv('PAYSTACK_SECRET_KEY'),
    paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL ?? `${frontendAppUrl}/payment/callback`,
    supabaseUrl: getEnv('VITE_SUPABASE_URL'),
    supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
};
