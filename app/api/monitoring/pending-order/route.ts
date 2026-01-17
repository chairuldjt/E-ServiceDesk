import { NextRequest, NextResponse } from 'next/server';
import { postExternalOrderPending } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getWebminConfig } from '@/lib/settings';
import { EXTERNAL_USERS } from '@/lib/constants';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { order_id, status_desc } = body;

        if (!order_id || !status_desc) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const config = await getWebminConfig(payload.id);
        if (!config || !config.user) {
            return NextResponse.json({ error: 'Koneksi Webmin belum disetting.' }, { status: 400 });
        }

        const externalUser = EXTERNAL_USERS.find(u => u.login === config.user);
        if (!externalUser) {
            return NextResponse.json({ error: `User Webmin '${config.user}' tidak terdaftar.` }, { status: 400 });
        }

        const externalPayload = {
            order_id,
            status_desc,
            create_by: externalUser.id
        };

        const result = await postExternalOrderPending(payload.id, externalPayload);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Pending Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
