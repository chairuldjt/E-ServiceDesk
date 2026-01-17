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

        const { user, pass, base_url } = await request.json();

        // If password is masked, we fetch existing config to get the real password
        const existing = await getWebminConfig(payload.id);

        let finalPass = pass;
        if (pass === '********') {
            finalPass = existing?.pass || '';
        }

        // Only allow base_url update if user is admin, otherwise use existing or DEFAULT
        let finalBaseUrl = existing?.base_url || process.env.EXTERNAL_API_BASE || 'http://172.16.1.212:5010';
        if (payload.role === 'admin' && base_url) {
            finalBaseUrl = base_url;
        }

        await saveWebminConfig(payload.id, {
            user,
            pass: finalPass,
            base_url: finalBaseUrl
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
