import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import { createMentionNotifications } from '@/lib/notifications';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;
        const connection = await pool.getConnection();

        const [comments]: any[] = await connection.execute(`
            SELECT 
                c.*, 
                u.username, 
                u.profile_image
            FROM timeline_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        connection.release();
        return NextResponse.json(comments);
    } catch (error) {
        console.error('Comments fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { content } = await request.json();

        const connection = await pool.getConnection();
        await connection.execute(
            'INSERT INTO timeline_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, payload.id, content]
        );

        connection.release();

        // Create notifications for mentioned users in comment
        if (content) {
            await createMentionNotifications(
                content,
                payload.id,
                'mention',
                `/timeline#post-${postId}`
            );
        }

        return NextResponse.json({ message: 'Comment added' });
    } catch (error) {
        console.error('Comment error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
