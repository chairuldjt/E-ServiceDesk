import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 });
    }

    try {
        const { sessionId, message } = await req.json();

        if (!sessionId || !message) {
            return NextResponse.json({ error: 'Missing sessionId or message' }, { status: 400 });
        }

        // Verify session ownership
        const [sessions]: any = await pool.query(
            'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
            [sessionId, user.id]
        );

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Save user message
        await pool.query(
            'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
            [sessionId, 'user', message]
        );

        // Get conversation history for context (last 10 messages)
        const [history]: any = await pool.query(
            'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 11',
            [sessionId]
        );
        const context = history.reverse().map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    ...context
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: 'OpenAI API error', details: errorData }, { status: response.status });
        }

        const aiData = await response.json();
        const aiMessage = aiData.choices[0].message.content;

        // Save assistant message
        await pool.query(
            'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
            [sessionId, 'assistant', aiMessage]
        );

        // Update session timestamp
        await pool.query(
            'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [sessionId]
        );

        return NextResponse.json({ assistant: aiMessage });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
