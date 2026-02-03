
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin' && payload.role !== 'super') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { webmin_id, username, full_name } = body;

        if (!webmin_id || !username || !full_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await pool.execute(
            'UPDATE webmin_users SET webmin_id = ?, username = ?, full_name = ? WHERE id = ?',
            [webmin_id, username, full_name, id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin' && payload.role !== 'super') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await pool.execute('DELETE FROM webmin_users WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
