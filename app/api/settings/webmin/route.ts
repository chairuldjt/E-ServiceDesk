import { NextRequest, NextResponse } from 'next/server';
import { getWebminConfig, saveWebminConfig } from '@/lib/settings';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET() {
    const payload = await getPayloadFromCookie();
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getWebminConfig(payload.id);
    if (!config) {
        return NextResponse.json({ user: '', pass: '' });
    }
    // Mask password for security
    return NextResponse.json({ ...config, pass: '********' });
}

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user, pass } = await request.json();

        // If password is masked, we fetch existing config to get the real password
        let finalPass = pass;
        if (pass === '********') {
            const existing = await getWebminConfig(payload.id);
            finalPass = existing?.pass || '';
        }

        // saveWebminConfig now only stores user and pass (base_url is from .env)
        await saveWebminConfig(payload.id, { user, pass: finalPass, base_url: process.env.EXTERNAL_API_BASE || '' });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
