import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getExternalToken } from '@/lib/externalApi';
import { getWebminConfig } from '@/lib/settings';

export async function GET(request: NextRequest) {
    const payload = await getPayloadFromCookie();
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const requestedDate = searchParams.get('date'); // YYYY-MM-DD

        const userId = payload.id;
        const config = await getWebminConfig(userId);
        if (!config || !config.user) {
            return NextResponse.json({ error: 'Webmin not configured' }, { status: 400 });
        }

        const webminUser = config.user;
        const { jwt, BASE } = await getExternalToken(userId);

        // ... existing user list fetch ...
        const userListRes = await fetch(`${BASE}/secure/user_list`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'access-token': jwt,
                'Accept': 'application/json',
            },
        });

        if (!userListRes.ok) {
            throw new Error('Gagal mengambil daftar user dari external API');
        }

        const userListData = await userListRes.json();
        const users = Array.isArray(userListData.result) ? userListData.result : [];
        const currentUser = users.find((u: any) => u.user_login === webminUser);

        if (!currentUser) {
            throw new Error(`User with login "${webminUser}" not found in external system`);
        }

        const fullName = currentUser.nama_lengkap;

        // 2. Fetch Orders
        const statuses = [10, 11, 12, 15];
        const fetchStatus = async (status: number) => {
            const res = await fetch(`${BASE}/order/order_list_by_status/${status}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'access-token': jwt,
                    'Accept': 'application/json',
                },
            });
            if (res.ok) {
                const data = await res.json();
                return Array.isArray(data.result) ? data.result : [];
            }
            return [];
        };

        const results = await Promise.all(statuses.map(fetchStatus));
        const allOrders = results.flat();

        // 3. Process Stats for selected date or TODAY
        const targetDate = requestedDate ? new Date(requestedDate) : new Date();
        const day = String(targetDate.getDate()).padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[targetDate.getMonth()];
        const year = String(targetDate.getFullYear()).slice(-2);
        const dateStr = `${day} ${month} ${year}`;

        let totalOrderCreated = 0;
        let totalReceived = 0;
        let totalCompleted = 0;

        allOrders.forEach((o: any) => {
            // Check if order is from today
            // Format match: o.create_date often looks like "20 Jan 26 - 00:30"
            if (o.create_date && o.create_date.includes(dateStr)) {

                // 1. Total Order yang dibuat hari ini: "order_by" matches fullName
                if (o.order_by === fullName) {
                    totalOrderCreated++;
                }

                // 2. Total Dapat orderan: "teknisi" matches fullName
                // Note: o.teknisi might be a pipe-separated list or just a name
                const teknisiList = (o.teknisi || '').split('|').map((t: string) => t.trim());
                if (teknisiList.includes(fullName)) {
                    totalReceived++;

                    // 3. Total Menyelesaikan Orderan: status_desc "DONE" and matches fullName
                    if (o.status_desc === 'DONE') {
                        totalCompleted++;
                    }
                }
            }
        });

        return NextResponse.json({
            fullName,
            webminUser,
            stats: {
                totalOrderCreated,
                totalReceived,
                totalCompleted
            }
        });

    } catch (error: any) {
        console.error('Order Stats API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
