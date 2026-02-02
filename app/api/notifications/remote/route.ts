import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { gateway_user, gateway_pass, user_id, sender_id, type, message, link } = await request.json();

        // 1. Verify Gateway Credentials
        const validUser = process.env.GATEWAY_USER || 'teknisi';
        const validPass = process.env.GATEWAY_PASS || 'rsdk201';

        if (gateway_user !== validUser || gateway_pass !== validPass) {
            return NextResponse.json({ error: 'Invalid gateway credentials' }, { status: 401 });
        }

        if (!user_id || !message) {
            return NextResponse.json({ error: 'user_id and message are required' }, { status: 400 });
        }

        // 2. Insert notification into database
        const connection = await pool.getConnection();

        if (user_id === 'everyone') {
            const [users]: any[] = await connection.execute('SELECT id FROM users WHERE is_active = 1 AND id != ?', [sender_id || 0]);
            for (const user of users) {
                await connection.execute(
                    'INSERT INTO notifications (user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?)',
                    [user.id, sender_id || null, type || 'system', message, link || null]
                );
            }
        } else {
            await connection.execute(
                'INSERT INTO notifications (user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?)',
                [user_id, sender_id || null, type || 'system', message, link || null]
            );
        }
        connection.release();

        return NextResponse.json({ success: true, message: 'Notification created' });
    } catch (error) {
        console.error('Remote notification error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
