import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import fs from 'fs';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `profile-${payload.id}-${Date.now()}.${fileExtension}`;

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile');
        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const path = join(uploadDir, fileName);
        await writeFile(path, buffer);

        const imageUrl = `/uploads/profile/${fileName}`;

        // Update user record
        const connection = await pool.getConnection();

        // Optional: Delete old image if exists
        const [oldUser]: any = await connection.execute('SELECT profile_image FROM users WHERE id = ?', [payload.id]);
        if (oldUser[0]?.profile_image) {
            const oldPath = join(process.cwd(), 'public', oldUser[0].profile_image);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        await connection.execute(
            'UPDATE users SET profile_image = ? WHERE id = ?',
            [imageUrl, payload.id]
        );
        connection.release();

        return NextResponse.json({
            message: 'Foto profil berhasil diperbarui',
            imageUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
