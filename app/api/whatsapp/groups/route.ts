import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'whatsapp_groups.json');

// Interface for Group
interface SavedGroup {
    id: string;
    alias: string;
    description?: string;
    added_at: string;
}

// Helper to read DB
async function getGroups(): Promise<SavedGroup[]> {
    if (!existsSync(DB_PATH)) {
        return [];
    }
    const data = await readFile(DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper to save DB
async function saveGroups(groups: SavedGroup[]) {
    const { mkdir } = await import('fs/promises');
    const dataDir = path.dirname(DB_PATH);

    // Create data directory if it doesn't exist
    if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
    }

    await writeFile(DB_PATH, JSON.stringify(groups, null, 2));
}

export async function GET() {
    try {
        const groups = await getGroups();
        return NextResponse.json(groups);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, alias, description } = body;

        if (!id || !alias) {
            return NextResponse.json({ error: 'ID and Alias are required' }, { status: 400 });
        }

        const groups = await getGroups();

        // check if duplicate ID
        const existingIndex = groups.findIndex(g => g.id === id);
        if (existingIndex !== -1) {
            // Update existing
            groups[existingIndex] = {
                ...groups[existingIndex],
                alias,
                description: description || groups[existingIndex].description
            };
        } else {
            // Add new
            groups.push({
                id,
                alias,
                description,
                added_at: new Date().toISOString()
            });
        }

        await saveGroups(groups);
        return NextResponse.json({ success: true, data: groups });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        let groups = await getGroups();
        groups = groups.filter(g => g.id !== id);

        await saveGroups(groups);
        return NextResponse.json({ success: true, data: groups });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
