import { NextRequest, NextResponse } from 'next/server';
import { postExternalOrder } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate required fields
        const { catatan, ext_phone, location_desc, service_catalog_id, order_by } = body;

        if (!catatan || !ext_phone || !location_desc) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const externalPayload = {
            order_id: 0,
            catatan,
            create_date: "",
            ext_phone,
            location_desc,
            service_catalog_id: parseInt(service_catalog_id) || 11,
            order_by: parseInt(order_by) || 33
        };

        const result = await postExternalOrder(payload.id, externalPayload);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Create External Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
