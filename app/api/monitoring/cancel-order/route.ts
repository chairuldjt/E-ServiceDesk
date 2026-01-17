import { NextRequest, NextResponse } from 'next/server';
import { postExternalOrderCancel } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { order_id } = body;

        if (!order_id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const externalPayload = {
            order_id,
            create_by: payload.id // Using local user ID as requester
        };

        const result = await postExternalOrderCancel(payload.id, externalPayload);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Cancel Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
