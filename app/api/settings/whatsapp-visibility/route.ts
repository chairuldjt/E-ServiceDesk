import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getSetting, saveSetting } from '@/lib/settings';

export async function GET() {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user-specific setting
        const isVisible = await getSetting('whatsapp_menu_visible', payload.id);
        // Default to true if not set
        return NextResponse.json({ visible: isVisible !== null ? isVisible : true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { visible } = await req.json();
        // Save setting for the current user
        await saveSetting('whatsapp_menu_visible', visible, payload.id);

        return NextResponse.json({ success: true, visible });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
