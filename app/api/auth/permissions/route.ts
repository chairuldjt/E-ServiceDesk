import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch current role from DB to handle renames
        const [userRows]: any = await pool.query('SELECT role FROM users WHERE id = ?', [payload.id]);
        if (userRows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const currentRole = userRows[0].role;

        const [rows]: any = await pool.query(
            `SELECT rp.menu_path 
             FROM role_permissions rp 
             JOIN roles r ON rp.role_id = r.id 
             WHERE r.name = ? AND rp.is_allowed = 1`,
            [currentRole]
        );

        const permissions = rows.map((row: any) => row.menu_path);

        // Always allow dashboard for logged in users if not explicitly denied
        if (!permissions.includes('/dashboard')) {
            permissions.push('/dashboard');
        }

        return NextResponse.json({ permissions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
