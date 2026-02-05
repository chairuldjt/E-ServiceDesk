import { NextRequest, NextResponse } from 'next/server';
import { postExternalOrder } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getWebminConfig } from '@/lib/settings';


export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate required fields
        const { catatan, ext_phone, location_desc, service_catalog_id, logbookId } = body;

        if (!catatan || !ext_phone || !location_desc || !service_catalog_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auto-detect Order By from Webmin Username
        const config = await getWebminConfig(payload.id);
        if (!config || !config.user) {
            return NextResponse.json({ error: 'Koneksi Webmin belum disetting. Silakan cek menu Setting Webmin.' }, { status: 400 });
        }

        const pool = (await import('@/lib/db')).default;
        const [rows]: any = await pool.execute('SELECT * FROM webmin_users WHERE username = ?', [config.user]);
        const externalUser = rows[0];

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
            order_by: externalUser.webmin_id
        };

        const result = await postExternalOrder(payload.id, externalPayload);

        // Update eservicedesk status to 'ordered' if logbookId is provided
        if (logbookId) {
            try {
                const pool = (await import('@/lib/db')).default;
                await pool.execute(
                    'UPDATE logbook SET status = ? WHERE id = ?',
                    ['ordered', logbookId]
                );
            } catch (dbError) {
                console.error('Failed to update logbook status after order creation:', dbError);
                // We don't return error here because the order was successfully created
            }
        }

        console.log('External Order System Response:', JSON.stringify(result));

        let orderId = result.id || result.order_id || (result.result && (result.result.id || result.result.order_id)) || (result.payload && result.payload.order_id);

        if ((!orderId || orderId === 0) && result.payload && result.payload.order_no) {
            console.log(`ID not found directly. Attempting to lookup Order ID for No: ${result.payload.order_no}`);
            try {
                const { getExternalOrdersByStatus } = await import('@/lib/externalApi');
                const openOrders = await getExternalOrdersByStatus(payload.id, 10);
                const matched = (openOrders || []).find((o: any) => o.order_no === result.payload.order_no);
                if (matched) {
                    orderId = matched.order_id;
                    console.log(`Lookup successful! ID: ${orderId}`);
                }
            } catch (err) {
                console.error('Lookup failed:', err);
            }
        }

        return NextResponse.json({
            ...result,
            id: orderId
        });
    } catch (error: any) {
        console.error('Create External Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
