import 'dotenv/config';

function getEnv(name: string, fallback?: string) {
    const value = process.env[name] ?? fallback;

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const env = {
    frontendAppUrl: getEnv('FRONTEND_APP_URL', process.env.APP_URL ?? 'http://localhost:5173'),
    port: Number(process.env.PORT || 3000),
    databaseUrl: getEnv('DATABASE_URL'),
    paystackSecretKey: getEnv('PAYSTACK_SECRET_KEY'),
    paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL ?? `${getEnv('FRONTEND_APP_URL', process.env.APP_URL ?? 'http://localhost:5173')}/payment/callback`,
    supabaseUrl: getEnv('VITE_SUPABASE_URL'),
    supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
};
