import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, chmod } from 'fs/promises';
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

        // Ensure upload directories exist and have correct permissions
        // We ensure the entire path starting from 'public'
        const publicDir = join(process.cwd(), 'public');
        const uploadsDir = join(publicDir, 'uploads');
        const uploadDir = join(uploadsDir, 'profile');

        const dirs = [publicDir, uploadsDir, uploadDir];
        for (const dir of dirs) {
            try {
                if (!fs.existsSync(dir)) {
                    await mkdir(dir, { recursive: true });
                }
                // Force permission 755 (drwxr-xr-x) for Linux production
                await chmod(dir, 0o755);
            } catch (e) { }
        }

        const path = join(uploadDir, fileName);
        await writeFile(path, buffer);

        // Explicitly set file permissions to 644 (rw-r--r--)
        await chmod(path, 0o644);

        const imageUrl = `/uploads/profile/${fileName}`;

        // Update user record
        const connection = await pool.getConnection();

        // Optional: Delete old image if exists
        const [oldUser]: any = await connection.execute('SELECT profile_image FROM users WHERE id = ?', [payload.id]);
        if (oldUser[0]?.profile_image) {
            // Remove any query params if present for path matching
            const oldRelativePath = oldUser[0].profile_image.split('?')[0];
            const oldPath = join(publicDir, oldRelativePath);
            if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { }
            }
        }

        // Add a timestamp to the saved database URL to act as a cache-buster in the UI
        const imageUrlWithCacheBuster = `${imageUrl}?t=${Date.now()}`;

        await connection.execute(
            'UPDATE users SET profile_image = ? WHERE id = ?',
            [imageUrlWithCacheBuster, payload.id]
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
