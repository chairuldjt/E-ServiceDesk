import { NextRequest, NextResponse } from 'next/server';
import { postExternalAssignOrderSave } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { order_id, teknisi_id, nama_lengkap } = body;

        if (!order_id || !teknisi_id || !nama_lengkap) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const externalPayload = {
            order_id,
            teknisi_id: teknisi_id.toString(),
            nama_lengkap,
            assign_type_code: "1",
            user_id: payload.id // Using local user ID
        };

        const result = await postExternalAssignOrderSave(payload.id, externalPayload);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Assign Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
