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
        const { order_id, id, teknisi_id, nama_lengkap, assign_type_code, assign_desc, emoji_code } = body;

        if (!order_id || !teknisi_id || !nama_lengkap) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const externalPayload = {
            id: id || order_id,
            order_id,
            teknisi_id: teknisi_id.toString(),
            nama_lengkap,
            assign_type_code: (assign_type_code || "1").toString(),
            assign_desc: assign_desc || "NEW",
            emoji_code: emoji_code || ":gear:",
            user_id: payload.id // Using local user ID
        };

        console.log('Sending Delegation to External API:', JSON.stringify(externalPayload));
        const result = await postExternalAssignOrderSave(payload.id, externalPayload);
        console.log('External Delegation Response:', JSON.stringify(result));
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Assign Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
