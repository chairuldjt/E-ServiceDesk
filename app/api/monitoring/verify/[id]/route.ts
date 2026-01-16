import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrderDetail, getExternalOrderHistory } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const [detail, history] = await Promise.all([
            getExternalOrderDetail(payload.id, parseInt(id)),
            getExternalOrderHistory(payload.id, parseInt(id))
        ]);

        return NextResponse.json({
            result: detail,
            history: history
        });
    } catch (error: any) {
        console.error('Order Detail API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
