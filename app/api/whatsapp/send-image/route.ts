import { NextResponse } from 'next/server';
import { sendImageFromFile } from '@/lib/whatsapp/bot';
import { writeFile, mkdir } from 'fs/promises';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    let tempPath: string | null = null;
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        const caption = formData.get('caption') as string;

        const saveAsAuto = formData.get('save_as_auto') === 'true';
        const skipSend = formData.get('skip_send') === 'true';
        const useSavedAuto = formData.get('use_saved_auto') === 'true';

        if (useSavedAuto) {
            const savedPath = path.join(process.cwd(), 'public', 'uploads', 'auto_image.png');
            await sendImageFromFile(savedPath, caption);
            return NextResponse.json({ success: true, isAutoImage: true });
        }

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        // Determine final path
        let finalPath: string;
        if (saveAsAuto) {
            finalPath = path.join(process.cwd(), 'public', 'uploads', 'auto_image.png');
            // We set tempPath to null so we don't delete it
            tempPath = null;
        } else {
            const filename = `upload_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            tempPath = path.join(uploadDir, filename);
            finalPath = tempPath;
        }

        await writeFile(finalPath, buffer);

        console.log(`File saved to: ${finalPath} (Auto: ${saveAsAuto})`);

        if (!skipSend) {
            await sendImageFromFile(finalPath, caption);
        }

        // Delete file after sending ONLY if it's a temp path
        if (tempPath) {
            try {
                await unlink(tempPath);
            } catch (e) {
                console.error('Failed to delete temp file:', e);
            }
        }

        return NextResponse.json({
            success: true,
            path: finalPath,
            isAutoImage: saveAsAuto
        });
    } catch (error: any) {
        console.error('WhatsApp Image Send Error:', error);

        // Try to clean up on error
        if (tempPath) {
            try {
                await unlink(tempPath);
            } catch (ignore) { }
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
