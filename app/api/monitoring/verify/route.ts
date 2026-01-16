import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrdersByStatus, postExternalVerify, getExternalOrderDetail, getExternalOrderHistory } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getWebminConfig } from '@/lib/settings';
import { EXTERNAL_USERS } from '@/lib/constants';

export async function GET() {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get List of Orders
        const list = await getExternalOrdersByStatus(payload.id, 15);

        // 2. Pre-fetch details and history for each (Parallel)
        // Note: We limit to top 20 to avoid external API timeout, 
        // usually unverified orders are few.
        const enrichedOrders = await Promise.all(
            list.slice(0, 20).map(async (order: any) => {
                try {
                    const [detail, history] = await Promise.all([
                        getExternalOrderDetail(payload.id, order.order_id),
                        getExternalOrderHistory(payload.id, order.order_id)
                    ]);
                    return { ...order, detail, history };
                } catch (e) {
                    return { ...order, detail: null, history: [] };
                }
            })
        );

        return NextResponse.json({ result: enrichedOrders });
    } catch (error: any) {
        console.error('Verify List API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { order_id, status_code, faq_note, note } = body;

        if (!order_id || !status_code) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auto-detect Admin/User ID for update_by from Webmin Username
        const config = await getWebminConfig(payload.id);
        if (!config || !config.user) {
            return NextResponse.json({ error: 'Koneksi Webmin belum disetting.' }, { status: 400 });
        }

        const externalUser = EXTERNAL_USERS.find(u => u.login === config.user);
        if (!externalUser) {
            return NextResponse.json({ error: `User Webmin '${config.user}' tidak terdaftar.` }, { status: 400 });
        }

        const verifyPayload = {
            order_id,
            status_code: status_code.toString(),
            faq_note: faq_note || "",
            note: note || "",
            update_by: externalUser.id
        };

        const result = await postExternalVerify(payload.id, verifyPayload);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Verify Submit API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
