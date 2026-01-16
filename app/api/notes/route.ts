import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

// GET all notes for the user
export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const connection = await pool.getConnection();
        const [rows]: any = await connection.execute(
            `SELECT n.*, u.username 
             FROM notes n 
             JOIN users u ON n.user_id = u.id 
             WHERE n.user_id = ? OR n.is_public = 1 
             ORDER BY n.updated_at DESC`,
            [payload.id]
        ); // eslint-disable-line @typescript-eslint/no-explicit-any
        connection.release();

        return NextResponse.json({ data: rows }, { status: 200 });
    } catch (error) {
        console.error('Get notes error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}

// CREATE new note
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { title, content, color, is_public } = await request.json();

        if (!title) {
            return NextResponse.json(
                { error: 'Judul harus diisi' },
                { status: 400 }
            );
        }

        const connection = await pool.getConnection();
        await connection.execute(
            'INSERT INTO notes (user_id, title, content, color, is_public) VALUES (?, ?, ?, ?, ?)',
            [payload.id, title, content || '', color || 'white', is_public ? 1 : 0]
        );

        const [result]: any = await connection.execute(
            'SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [payload.id]
        ); // eslint-disable-line @typescript-eslint/no-explicit-any
        connection.release();

        return NextResponse.json(
            { message: 'Catatan berhasil dibuat', data: result[0] },
            { status: 201 }
        );
    } catch (error) {
        console.error('Create note error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}
