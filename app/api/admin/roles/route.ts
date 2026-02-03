import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAdminAccess } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
    try {
        const payload = await checkAdminAccess();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [rows] = await pool.query('SELECT * FROM roles ORDER BY name ASC');
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await checkAdminAccess();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, color } = body;

        if (!name) {
            return NextResponse.json({ error: 'Nama role wajib diisi' }, { status: 400 });
        }

        const [result]: any = await pool.execute(
            'INSERT INTO roles (name, description, color) VALUES (?, ?, ?)',
            [name, description, color || 'indigo']
        );

        return NextResponse.json({ id: result.insertId, name, description, color: color || 'indigo' }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Nama role sudah ada' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
