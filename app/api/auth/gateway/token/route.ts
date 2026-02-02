import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { gateway_user, gateway_pass, username } = await request.json();

        // 1. Verify Gateway Credentials
        const validUser = process.env.GATEWAY_USER || 'teknisi';
        const validPass = process.env.GATEWAY_PASS || 'rsdk201';

        if (gateway_user !== validUser || gateway_pass !== validPass) {
            return NextResponse.json({ error: 'Invalid gateway credentials' }, { status: 401 });
        }

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // 2. Find user in EServiceDesk database
        const connection = await pool.getConnection();
        const [rows]: any = await connection.execute(
            'SELECT id, username, email, role FROM users WHERE username = ? AND is_active = 1',
            [username]
        );
        connection.release();

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User not found in EServiceDesk' }, { status: 404 });
        }

        const user = rows[0];

        // 3. Generate token
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });

        return NextResponse.json({ token, user_id: user.id });
    } catch (error) {
        console.error('Gateway token error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
