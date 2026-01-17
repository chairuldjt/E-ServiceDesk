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

        // This is generic for order_save (create or edit)
        // For edit, order_id > 0
        const result = await postExternalOrder(payload.id, body);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Edit Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
