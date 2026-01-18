import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getSetting, saveSetting } from '@/lib/settings';

export async function GET() {
    try {
        const isVisible = await getSetting('whatsapp_menu_visible', 0);
        // Default to true if not set
        return NextResponse.json({ visible: isVisible !== null ? isVisible : true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { visible } = await req.json();
        await saveSetting('whatsapp_menu_visible', visible, 0);

        return NextResponse.json({ success: true, visible });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
