import { NextRequest, NextResponse } from 'next/server';
import { getWebminConfig, saveWebminConfig } from '@/lib/settings';

export async function GET() {
    const config = await getWebminConfig();
    if (!config) {
        return NextResponse.json({ user: '', pass: '', base_url: 'http://172.16.1.212:5010' });
    }
    // Mask password for security
    return NextResponse.json({ ...config, pass: '********' });
}

export async function POST(request: NextRequest) {
    try {
        const { user, pass, base_url } = await request.json();

        // If password is masked, we fetch existing config to get the real password
        let finalPass = pass;
        if (pass === '********') {
            const existing = await getWebminConfig();
            finalPass = existing?.pass || '';
        }

        await saveWebminConfig({ user, pass: finalPass, base_url });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
