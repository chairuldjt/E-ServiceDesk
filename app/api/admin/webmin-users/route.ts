
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin' && payload.role !== 'super') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [rows] = await pool.query('SELECT * FROM webmin_users ORDER BY full_name ASC');
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin' && payload.role !== 'super') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { webmin_id, username, full_name } = body;

        if (!webmin_id || !username || !full_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const [result]: any = await pool.execute(
            'INSERT INTO webmin_users (webmin_id, username, full_name) VALUES (?, ?, ?)',
            [webmin_id, username, full_name]
        );

        return NextResponse.json({ id: result.insertId, webmin_id, username, full_name }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
