
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    const payload = await getPayloadFromCookie();
    if (!payload?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [rows]: any = await pool.execute(
            'SELECT kariadi_username FROM users WHERE id = ?',
            [payload.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            username: rows[0].kariadi_username || ''
        });
    } catch (error: any) {
        console.error('Failed to fetch Kariadi settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const payload = await getPayloadFromCookie();
    if (!payload?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        await pool.execute(
            'UPDATE users SET kariadi_username = ?, kariadi_password = ? WHERE id = ?',
            [username, password, payload.id]
        );

        return NextResponse.json({ success: true, message: 'Kariadi credentials updated' });
    } catch (error: any) {
        console.error('Failed to update Kariadi settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
