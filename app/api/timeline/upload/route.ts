import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, chmod } from 'fs/promises';
import { join } from 'path';
import { getPayloadFromCookie } from '@/lib/jwt';
import fs from 'fs';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        const uploadedUrls: string[] = [];
        const rootDir = process.cwd();
        const uploadsDir = join(rootDir, 'uploads');
        const timelineDir = join(uploadsDir, 'timeline');

        const dirs = [uploadsDir, timelineDir];
        for (const dir of dirs) {
            try {
                if (!fs.existsSync(dir)) {
                    await mkdir(dir, { recursive: true });
                }
                await chmod(dir, 0o755);
            } catch (error) { console.error('Error creating directory:', error); }
        }

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const fileExtension = file.name.split('.').pop();
            const fileName = `timeline-${payload.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExtension}`;
            const path = join(timelineDir, fileName);

            await writeFile(path, buffer);
            await chmod(path, 0o644);

            uploadedUrls.push(`/api/view-uploads/timeline/${fileName}`);
        }

        return NextResponse.json({
            message: 'Images uploaded successfully',
            urls: uploadedUrls
        });
    } catch (error) {
        console.error('Timeline upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
