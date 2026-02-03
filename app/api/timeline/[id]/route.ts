import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import { join } from 'path';
import fs from 'fs';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { is_pinned, privacy, content, images } = body;

        const connection = await pool.getConnection();

        // Check ownership
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [post]: any[] = await connection.execute('SELECT user_id FROM timeline WHERE id = ?', [postId]);
        if (post.length === 0) {
            connection.release();
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (post[0].user_id !== payload.id && !['admin', 'moderator'].includes(payload.role)) {
            connection.release();
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updates: string[] = [];
        const values: (string | number)[] = [];

        if (is_pinned !== undefined) {
            updates.push('is_pinned = ?');
            values.push(is_pinned);
        }

        if (privacy !== undefined) {
            updates.push('privacy = ?');
            values.push(privacy);
        }

        if (content !== undefined) {
            updates.push('content = ?');
            values.push(content);
        }

        if (images !== undefined) {
            updates.push('images = ?');
            values.push(JSON.stringify(images));
        }

        if (updates.length > 0) {
            values.push(postId);
            await connection.execute(
                `UPDATE timeline SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }

        connection.release();
        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error('Timeline PATCH error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const connection = await pool.getConnection();

        // Check ownership and get images
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [post]: any[] = await connection.execute('SELECT user_id, images FROM timeline WHERE id = ?', [postId]);
        if (post.length === 0) {
            connection.release();
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (post[0].user_id !== payload.id && !['admin', 'moderator'].includes(payload.role)) {
            connection.release();
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete images from disk
        const images = JSON.parse(post[0].images || '[]');
        const rootDir = process.cwd();
        for (const imageUrl of images) {
            if (imageUrl.startsWith('/api/view-uploads/timeline/')) {
                const fileName = imageUrl.replace('/api/view-uploads/timeline/', '');
                const filePath = join(rootDir, 'uploads', 'timeline', fileName);
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (error) { console.error('Error deleting file:', error); }
                }
            }
        }

        await connection.execute('DELETE FROM timeline WHERE id = ?', [postId]);
        connection.release();

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Timeline DELETE error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
