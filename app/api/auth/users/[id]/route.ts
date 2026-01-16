import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// PUT update user (Role, Status, Reset Password)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const { role, is_active, password } = await request.json(); // Optional fields

        const connection = await pool.getConnection();

        // Check if user exists
        const [existing]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            connection.release();
            return NextResponse.json(
                { error: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        // Build query dynamically
        const fieldsToUpdate = [];
        const values = [];

        if (role !== undefined) {
            fieldsToUpdate.push('role = ?');
            values.push(role);
        }

        if (is_active !== undefined) {
            fieldsToUpdate.push('is_active = ?');
            values.push(is_active ? 1 : 0);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            fieldsToUpdate.push('password_hash = ?');
            values.push(hashedPassword);
        }

        if (fieldsToUpdate.length > 0) {
            values.push(id);
            await connection.execute(
                `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
                values
            );
        }

        const [updatedUser]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
            'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?',
            [id]
        );

        connection.release();

        return NextResponse.json(
            { message: 'User berhasil diupdate', data: updatedUser[0] },
            { status: 200 }
        );
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Gagal update user' },
            { status: 500 }
        );
    }
}

// DELETE user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const { id } = await params;

        // Prevent deleting self
        if (String(payload.id) === String(id)) {
            return NextResponse.json(
                { error: 'Tidak dapat menghapus akun sendiri' },
                { status: 400 }
            );
        }

        const connection = await pool.getConnection();
        await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        connection.release();

        return NextResponse.json(
            { message: 'User berhasil dihapus' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus user' },
            { status: 500 }
        );
    }
}
