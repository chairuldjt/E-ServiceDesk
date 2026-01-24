import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const connection = await pool.getConnection();

        // Check if liked
        const [existing]: any[] = await connection.execute(
            'SELECT id FROM timeline_likes WHERE post_id = ? AND user_id = ?',
            [postId, payload.id]
        );

        if (existing.length > 0) {
            // Unlike
            await connection.execute(
                'DELETE FROM timeline_likes WHERE post_id = ? AND user_id = ?',
                [postId, payload.id]
            );
            connection.release();
            return NextResponse.json({ liked: false });
        } else {
            // Like
            await connection.execute(
                'INSERT INTO timeline_likes (post_id, user_id) VALUES (?, ?)',
                [postId, payload.id]
            );
            connection.release();
            return NextResponse.json({ liked: true });
        }
    } catch (error) {
        console.error('Like error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
