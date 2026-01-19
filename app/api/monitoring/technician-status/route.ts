import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET() {
    try {
        const [rows]: any = await pool.query('SELECT * FROM technician_status');
        return NextResponse.json({ data: rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const payload = await getPayloadFromCookie();
    if (!payload || payload.role !== 'admin' && payload.role !== 'super') {
        return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 401 });
    }

    try {
        const { technician_name, is_off_order } = await request.json();

        // Use UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)
        await pool.query(
            'INSERT INTO technician_status (technician_name, is_off_order) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_off_order = ?',
            [technician_name, is_off_order ? 1 : 0, is_off_order ? 1 : 0]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Technician Status Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
