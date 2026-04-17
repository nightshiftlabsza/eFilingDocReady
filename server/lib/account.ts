import type { PoolClient } from 'pg';
import type { Persona } from '../../src/types/account';
import { query } from './db';

export interface AccountRow {
    id: string;
    auth_user_id: string | null;
    email: string;
    normalized_email: string;
    persona: Persona | null;
}

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function findAccountByAuthUserId(authUserId: string, client?: PoolClient) {
    const result = await query<AccountRow>(
        `select id, auth_user_id, email, normalized_email, persona
         from users
         where auth_user_id = $1`,
        [authUserId],
        client,
    );

    return result.rows[0] ?? null;
}

export async function findAccountByNormalizedEmail(normalizedEmail: string, client?: PoolClient) {
    const result = await query<AccountRow>(
        `select id, auth_user_id, email, normalized_email, persona
         from users
         where normalized_email = $1`,
        [normalizedEmail],
        client,
    );

    return result.rows[0] ?? null;
}

export async function createAccount(email: string, authUserId: string | null, client?: PoolClient) {
    const normalizedEmail = normalizeEmail(email);
    const result = await query<AccountRow>(
        `insert into users (email, normalized_email, auth_user_id)
         values ($1, $2, $3)
         on conflict (normalized_email) do update
         set email = excluded.email,
             auth_user_id = coalesce(users.auth_user_id, excluded.auth_user_id),
             updated_at = now()
         returning id, auth_user_id, email, normalized_email, persona`,
        [email.trim(), normalizedEmail, authUserId],
        client,
    );

    return result.rows[0];
}

export async function linkAccountToAuthUser(accountId: string, authUserId: string, client?: PoolClient) {
    const result = await query<AccountRow>(
        `update users
         set auth_user_id = $2,
             updated_at = now()
         where id = $1
         returning id, auth_user_id, email, normalized_email, persona`,
        [accountId, authUserId],
        client,
    );

    return result.rows[0] ?? null;
}

export async function upsertProfilePersona(accountId: string, persona: Persona, client?: PoolClient) {
    await query(
        `update users
         set persona = $2,
             updated_at = now()
         where id = $1`,
        [accountId, persona],
        client,
    );
}

export async function getProfile(accountId: string, client?: PoolClient) {
    const result = await query<Pick<AccountRow, 'persona'>>(
        `select persona
         from users
         where id = $1`,
        [accountId],
        client,
    );

    return result.rows[0] ?? { persona: null };
}
