import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAdminAccess } from '@/lib/adminAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const payload = await checkAdminAccess();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const [rows] = await pool.query('SELECT menu_path, is_allowed FROM role_permissions WHERE role_id = ?', [id]);
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
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
        const { permissions } = body; // Array of { menu_path: string, is_allowed: boolean }

        if (!Array.isArray(permissions)) {
            return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
        }

        // Use a transaction for consistency
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            for (const perm of permissions) {
                await connection.execute(
                    `INSERT INTO role_permissions (role_id, menu_path, is_allowed) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`,
                    [id, perm.menu_path, perm.is_allowed ? 1 : 0]
                );
            }
            await connection.commit();
            return NextResponse.json({ message: 'Permissions berhasil diupdate' });
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
