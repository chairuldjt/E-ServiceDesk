import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrderAssignList } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId') || '0';

        const result = await getExternalOrderAssignList(payload.id, parseInt(orderId));
        return NextResponse.json({ result });
    } catch (error: any) {
        console.error('Assign List API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
