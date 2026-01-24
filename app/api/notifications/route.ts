import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET(_request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const connection = await pool.getConnection();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [notifications]: any[] = await connection.execute(`
            SELECT 
                n.*,
                u.username as sender_username,
                u.profile_image as sender_image
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [payload.id]);

        connection.release();
        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { notificationId, markAllAsRead } = await request.json();
        const connection = await pool.getConnection();

        if (markAllAsRead) {
            await connection.execute(
                'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
                [payload.id]
            );
        } else if (notificationId) {
            await connection.execute(
                'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
                [notificationId, payload.id]
            );
        }

        connection.release();
        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error('Notification update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
