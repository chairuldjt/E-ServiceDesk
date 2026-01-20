import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    try {
        // Check if session belongs to user
        const [sessions]: any = await pool.query(
            'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
            [sessionId, user.id]
        );

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const [messages] = await pool.query(
            'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
            [sessionId]
        );

        return NextResponse.json(messages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
