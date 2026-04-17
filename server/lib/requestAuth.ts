import type { Request } from 'express';
import { withTransaction } from './db';
import { supabaseAdmin } from './supabase';
import {
    createAccount,
    findAccountByAuthUserId,
    findAccountByNormalizedEmail,
    linkAccountToAuthUser,
    normalizeEmail,
    type AccountRow,
} from './account';

function getBearerToken(req: Request) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice('Bearer '.length).trim();
}

export async function resolveAuthenticatedAccount(req: Request): Promise<AccountRow | null> {
    const token = getBearerToken(req);
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user.email) {
        return null;
    }

    const email = data.user.email.trim();
    const normalizedEmail = normalizeEmail(email);

    return withTransaction(async (client) => {
        const byAuthId = await findAccountByAuthUserId(data.user.id, client);
        if (byAuthId) {
            return byAuthId;
        }

        const byEmail = await findAccountByNormalizedEmail(normalizedEmail, client);
        if (byEmail) {
            if (!byEmail.auth_user_id) {
                const linked = await linkAccountToAuthUser(byEmail.id, data.user.id, client);
                if (linked) return linked;
            }
            return byEmail;
        }

        return createAccount(email, data.user.id, client);
    });
}
