import { getPayloadFromCookie } from './jwt';
import pool from './db';

export async function checkAdminAccess() {
    const payload = await getPayloadFromCookie();
    if (!payload) return null;

    if (payload.role === 'admin') return payload;

    // Check dynamic permission
    const [rows]: any = await pool.query(
        `SELECT rp.is_allowed 
         FROM role_permissions rp 
         JOIN roles r ON rp.role_id = r.id 
         JOIN users u ON u.role = r.name
         WHERE u.id = ? AND rp.menu_path = '/admin' AND rp.is_allowed = 1`,
        [payload.id]
    );

    if (rows.length > 0) return payload;

    return null;
}
