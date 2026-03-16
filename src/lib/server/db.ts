import pg from 'pg';

const { Pool } = pg;

// Use Vercel Postgres environment variables or a standard DATABASE_URL
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export async function query(text: string, params: any[]) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        console.log('executed query', { text, duration, rows: res.rowCount });
    }
    return res;
}

/** Initialise the database schema if it doesn't exist */
export async function initDb() {
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            has_pro_access BOOLEAN DEFAULT FALSE,
            customer_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS magic_tokens (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, []);
}
