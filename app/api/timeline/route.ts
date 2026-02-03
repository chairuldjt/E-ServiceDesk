import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import { createMentionNotifications } from '@/lib/notifications';

export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        const connection = await pool.getConnection();

        // Build search condition
        let whereClause = "(t.privacy = 'public' OR t.user_id = ?)";
        const queryParams: (string | number)[] = [payload.id];

        if (search) {
            whereClause += " AND (t.content LIKE ? OR u.username LIKE ?)";
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Get total count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [countResult]: any[] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM timeline t
            JOIN users u ON t.user_id = u.id
            WHERE ${whereClause}
        `, queryParams);

        const total = countResult[0].total;

        // Fetch posts: Pinned posts first, then newest first
        // If not the owner, only show 'public' posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postQueryParams = [payload.id, payload.role, payload.id, ...queryParams, limit, offset];
        const [posts]: any[] = await connection.execute(`
            SELECT 
                t.*, 
                u.username, 
                u.profile_image,
                (t.user_id = ? OR ? IN ('admin', 'moderator')) as is_owner,
                (SELECT COUNT(*) FROM timeline_likes WHERE post_id = t.id) as like_count,
                (SELECT COUNT(*) FROM timeline_comments WHERE post_id = t.id) as comment_count,
                EXISTS(SELECT 1 FROM timeline_likes WHERE post_id = t.id AND user_id = ?) as user_liked
            FROM timeline t
            JOIN users u ON t.user_id = u.id
            WHERE ${whereClause}
            ORDER BY t.is_pinned DESC, t.created_at DESC
            LIMIT ? OFFSET ?
        `, postQueryParams);

        connection.release();

        return NextResponse.json({ posts, total, page, limit });
    } catch (error) {
        console.error('Timeline GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { content, images, privacy } = body;

        const connection = await pool.getConnection();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [result]: any = await connection.execute(
            'INSERT INTO timeline (user_id, content, images, privacy) VALUES (?, ?, ?, ?)',
            [payload.id, content, JSON.stringify(images || []), privacy || 'public']
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [newPost]: any[] = await connection.execute(`
            SELECT 
                t.*, 
                u.username, 
                u.profile_image,
                1 as is_owner,
                0 as like_count,
                0 as comment_count,
                0 as user_liked
            FROM timeline t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `, [result.insertId]);

        connection.release();

        // Create notifications for mentioned users
        if (content) {
            await createMentionNotifications(
                content,
                payload.id,
                'mention',
                `/timeline#post-${result.insertId}`
            );
        }

        return NextResponse.json(newPost[0]);
    } catch (error) {
        console.error('Timeline POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
