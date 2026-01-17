import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { contentType } from 'mime-types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathParts } = await params;
        const filePath = join(process.cwd(), 'uploads', ...pathParts);

        if (!existsSync(filePath)) {
            return new NextResponse('File Not Found', { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const fileName = pathParts[pathParts.length - 1];
        const mimeType = contentType(fileName) || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
