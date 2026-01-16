import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// GET profile
export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const connection = await pool.getConnection();
        const [rows]: any = await connection.execute(
            'SELECT id, username, email, role, is_active, profile_image, created_at FROM users WHERE id = ?',
            [payload.id]
        );
        connection.release();

        if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({ data: rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// UPDATE profile (username, email, password)
export async function PUT(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { username, email, currentPassword, newPassword } = await request.json();

        const connection = await pool.getConnection();

        // If updating password, verify current password
        if (newPassword) {
            const [rows]: any = await connection.execute('SELECT password_hash FROM users WHERE id = ?', [payload.id]);
            const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
            if (!isMatch) {
                connection.release();
                return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
            }

            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            await connection.execute(
                'UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?',
                [username, email, newHashedPassword, payload.id]
            );
        } else {
            await connection.execute(
                'UPDATE users SET username = ?, email = ? WHERE id = ?',
                [username, email, payload.id]
            );
        }

        const [updatedUser]: any = await connection.execute(
            'SELECT id, username, email, role, profile_image FROM users WHERE id = ?',
            [payload.id]
        );
        connection.release();

        return NextResponse.json({
            message: 'Profil berhasil diperbarui',
            data: updatedUser[0]
        });
    } catch (error: any) {
        console.error('Update profile error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Username atau Email sudah digunakan' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
