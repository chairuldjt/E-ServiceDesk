import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        const [rows]: any = await connection.execute(
            'SELECT id, username FROM users WHERE username = ? AND is_active = 1',
            [username]
        );
        connection.release();

        if (rows.length === 0) {
            return NextResponse.json({ exists: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ exists: true, id: rows[0].id, username: rows[0].username });
    } catch (error) {
        console.error('User find error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
