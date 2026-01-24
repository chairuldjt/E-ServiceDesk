import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET(_request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const connection = await pool.getConnection();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [rows]: any[] = await connection.execute(
            'SELECT id, username, profile_image FROM users WHERE is_active = 1 ORDER BY username ASC'
        );
        connection.release();

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Mentions fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
