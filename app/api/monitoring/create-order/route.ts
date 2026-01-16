import { NextRequest, NextResponse } from 'next/server';
import { postExternalOrder } from '@/lib/externalApi';
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

        // Validate required fields
        const { catatan, ext_phone, location_desc, service_catalog_id } = body;

        if (!catatan || !ext_phone || !location_desc || !service_catalog_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auto-detect Order By from Webmin Username
        const config = await getWebminConfig(payload.id);
        if (!config || !config.user) {
            return NextResponse.json({ error: 'Koneksi Webmin belum disetting. Silakan cek menu Setting Webmin.' }, { status: 400 });
        }

        const externalUser = EXTERNAL_USERS.find(u => u.login === config.user);
        if (!externalUser) {
            return NextResponse.json({ error: `User Webmin '${config.user}' tidak terdaftar di sistem order. Mohon hubungi admin.` }, { status: 400 });
        }

        const externalPayload = {
            order_id: 0,
            catatan,
            create_date: "",
            ext_phone,
            location_desc,
            service_catalog_id: parseInt(service_catalog_id),
            order_by: externalUser.id
        };

        const result = await postExternalOrder(payload.id, externalPayload);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Create External Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
