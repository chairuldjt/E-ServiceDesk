import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrderSummary } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET() {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await getExternalOrderSummary(payload.id);
        if (!data) {
            return NextResponse.json({ error: 'Gagal mengambil summary order' }, { status: 500 });
        }

        return NextResponse.json({ result: data });
    } catch (error: any) {
        console.error('Summary API Error:', error);
        return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
    }
}
