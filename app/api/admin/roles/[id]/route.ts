import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAdminAccess } from '@/lib/adminAuth';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const payload = await checkAdminAccess();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, description, color } = body;

        const [existing]: any = await pool.query('SELECT name FROM roles WHERE id = ?', [id]);
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 });
        }

        const oldName = existing[0].name;

        // Use a transaction for consistent renaming
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Update roles table
            await connection.execute(
                'UPDATE roles SET name = ?, description = ?, color = ? WHERE id = ?',
                [name, description, color || 'indigo', id]
            );

            // 2. If name changed, update users and permissions
            if (oldName !== name) {
                await connection.execute(
                    'UPDATE users SET role = ? WHERE role = ?',
                    [name, oldName]
                );
                // role_permissions uses role_id, so it's already safe if it's just name change.
                // But if there were any other tables referencing role by NAME, they should be updated here.
            }

            await connection.commit();
            return NextResponse.json({ message: 'Role berhasil diupdate' });
        } catch (err: any) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const payload = await checkAdminAccess();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check if role is in use
        const [role]: any = await pool.query('SELECT name FROM roles WHERE id = ?', [id]);
        if (role.length > 0) {
            const roleName = role[0].name;
            const [users]: any = await pool.query('SELECT id FROM users WHERE role = ?', [roleName]);
            if (users.length > 0) {
                return NextResponse.json({ error: 'Role sedang digunakan oleh user, tidak bisa dihapus' }, { status: 400 });
            }

            // Prevent deleting admin role
            if (roleName === 'admin') {
                return NextResponse.json({ error: 'Role admin tidak bisa dihapus' }, { status: 400 });
            }
        }

        await pool.execute('DELETE FROM roles WHERE id = ?', [id]);
        return NextResponse.json({ message: 'Role berhasil dihapus' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
