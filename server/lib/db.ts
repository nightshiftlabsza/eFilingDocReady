import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { env } from './env';

const { Pool } = pg;

export const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes('localhost')
        ? false
        : {
            rejectUnauthorized: false,
        },
});

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = [], client?: PoolClient) {
    const runner = client ?? pool;
    return runner.query(text, params) as Promise<QueryResult<T>>;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
