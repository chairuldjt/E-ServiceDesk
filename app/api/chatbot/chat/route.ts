import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

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
                    {
                        role: 'system',
                        content: `You are a helpful assistant. 
                        If the user wants to generate or create an image/visual, start your response with '[GENERATE_IMAGE: <prompt>]' where <prompt> is a highly detailed English description for DALL-E 3. 
                        Example: '[GENERATE_IMAGE: A futuristic city with neon lights, digital art style]'.
                        If the user does not want an image, respond normally.`
                    },
                    ...context
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error Details:', JSON.stringify(errorData, null, 2));
            const errorMessage = errorData.error?.message || 'Unknown OpenAI API error';
            return NextResponse.json({ error: errorMessage, details: errorData }, { status: response.status });
        }

        const aiData = await response.json();
        let aiMessage = aiData.choices[0].message.content;

        // Check for image generation request
        const imageMatch = aiMessage.match(/\[GENERATE_IMAGE:\s*(.*?)\]/i);
        if (imageMatch) {
            const imagePrompt = imageMatch[1];

            try {
                // Call DALL-E API
                const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'dall-e-3',
                        prompt: imagePrompt,
                        n: 1,
                        size: '1024x1024'
                    })
                });

                if (dalleRes.ok) {
                    const dalleData = await dalleRes.json();
                    const imageUrl = dalleData.data[0].url;

                    // Download and save image locally
                    const imgResponse = await fetch(imageUrl);
                    const arrayBuffer = await imgResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const filename = `img_${Date.now()}.png`;
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chatbot');
                    const filePath = path.join(uploadDir, filename);

                    // Ensure directory exists
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    await writeFile(filePath, buffer);

                    const localUrl = `/uploads/chatbot/${filename}`;
                    aiMessage = aiMessage.replace(/\[GENERATE_IMAGE:\s*.*?\]/i, `![${imagePrompt}](${localUrl})`);
                } else {
                    const dalleError = await dalleRes.json();
                    aiMessage = `Maaf, saya gagal membuat gambar tersebut. Error: ${dalleError.error?.message || 'Unknown error'}`;
                }
            } catch (err: any) {
                console.error('DALL-E Error:', err);
                aiMessage = `Maaf, terjadi kesalahan saat mencoba membuat gambar: ${err.message}`;
            }
        }

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
