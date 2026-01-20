import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET() {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [rows] = await pool.query(
            'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
            [user.id]
        );
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { title } = await req.json();
        const [result]: any = await pool.query(
            'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
            [user.id, title || 'New Chat']
        );

        return NextResponse.json({
            id: result.insertId,
            user_id: user.id,
            title: title || 'New Chat'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { sessionId } = await req.json();
        await pool.query(
            'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
            [sessionId, user.id]
        );
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
