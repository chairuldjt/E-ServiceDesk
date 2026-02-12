
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';

export async function getKariadiCredentials() {
    const payload = await getPayloadFromCookie();
    if (!payload?.id) {
        return { error: 'Unauthorized', status: 401 };
    }

    try {
        const [rows]: any = await pool.execute(
            'SELECT kariadi_username, kariadi_password FROM users WHERE id = ?',
            [payload.id]
        );

        if (rows.length === 0) {
            return { error: 'User not found', status: 404 };
        }

        const user = rows[0];
        if (!user.kariadi_username || !user.kariadi_password) {
            return { error: 'MISSING_KARIADI_CREDENTIALS', status: 403 };
        }

        return {
            credentials: {
                username: user.kariadi_username,
                password: user.kariadi_password
            }
        };
    } catch (e: any) {
        console.error('Database error fetching credentials:', e);
        return { error: 'Internal Server Error', status: 500 };
    }
}
