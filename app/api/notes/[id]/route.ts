import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

// PUT update note
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const { title, content, color, is_public, is_pinned } = await request.json();

        const connection = await pool.getConnection();
        const [existingNote]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
            'SELECT * FROM notes WHERE id = ?',
            [id]
        );

        if (existingNote.length === 0) {
            connection.release();
            return NextResponse.json(
                { error: 'Catatan tidak ditemukan' },
                { status: 404 }
            );
        }

        const note = existingNote[0];

        // Check authorization (allow if owner or admin)
        if (note.user_id !== payload.id && payload.role !== 'admin') {
            connection.release();
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        await connection.execute(
            'UPDATE notes SET title = ?, content = ?, color = ?, is_public = ?, is_pinned = ? WHERE id = ?',
            [title, content, color, is_public ? 1 : 0, is_pinned ? 1 : 0, id]
        );

        const [updated]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
            'SELECT * FROM notes WHERE id = ?',
            [id]
        );
        connection.release();

        return NextResponse.json(
            { message: 'Catatan berhasil diupdate', data: updated[0] },
            { status: 200 }
        );
    } catch (error) {
        console.error('Update note error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}

// DELETE note
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const connection = await pool.getConnection();
        const [existingNote]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
            'SELECT * FROM notes WHERE id = ?',
            [id]
        );

        if (existingNote.length === 0) {
            connection.release();
            return NextResponse.json(
                { error: 'Catatan tidak ditemukan' },
                { status: 404 }
            );
        }

        const note = existingNote[0];

        // Check authorization (allow if owner or admin)
        if (note.user_id !== payload.id && payload.role !== 'admin') {
            connection.release();
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        await connection.execute('DELETE FROM notes WHERE id = ?', [id]);
        connection.release();

        return NextResponse.json(
            { message: 'Catatan berhasil dihapus' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Delete note error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}
