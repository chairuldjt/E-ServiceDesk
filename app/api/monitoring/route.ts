import { NextRequest, NextResponse } from 'next/server';
import { getExternalToken } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

// Simple in-memory cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 50 * 1000; // 15 seconds (reduced for faster updates)
const STATUSES = [11, 12, 15]; // followup, running, done

export async function GET(request: NextRequest) {
    const payload = await getPayloadFromCookie();
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nocache = searchParams.get('nocache') === '1';
    const requestedDate = searchParams.get('date'); // YYYY-MM-DD

    if (!nocache && cache && (Date.now() - cache.timestamp) < CACHE_TTL && !requestedDate) {
        return NextResponse.json(cache.data);
    }

    try {
        const { jwt, BASE } = await getExternalToken(payload.id);

        // 3. Get Orders in Parallel (MUCH FASTER)
        const fetchStatus = async (status: number) => {
            const orderRes = await fetch(`${BASE}/order/order_list_by_status/${status}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'access-token': jwt,
                    'Accept': 'application/json',
                },
            });
            if (orderRes.ok) {
                const data = await orderRes.json();
                return data.result && Array.isArray(data.result) ? data.result : [];
            }
            return [];
        };

        const results = await Promise.all(STATUSES.map(fetchStatus));
        let allOrders = results.flat();

        // 4. Filter by User - REMOVED for global data

        // 5. Process Data
        const today = new Date();
        const dateToFilter = requestedDate ? new Date(requestedDate) : today;

        // PHP format: "d M y" (e.g., "16 Jan 26")
        const day = String(dateToFilter.getDate()).padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[dateToFilter.getMonth()];
        const year = String(dateToFilter.getFullYear()).slice(-2);
        const dateStringPHP = `${day} ${month} ${year}`;

        const dateISO = dateToFilter.toISOString().split('T')[0];

        const rekap: { [key: string]: number } = {};
        let totalOrder = 0;

        const [webminUsers]: any = await (await import('@/lib/db')).default.query('SELECT * FROM webmin_users');

        allOrders.forEach((o: any) => {
            if (o.create_date && o.create_date.includes(dateStringPHP)) {
                totalOrder++;

                const list = (o.teknisi || '').split('|');
                list.forEach((nama: string) => {
                    const trimmed = nama.trim();
                    if (trimmed === "") return;

                    // Match name with webminUsers to get full name
                    const userMatch = webminUsers.find((u: any) =>
                        u.full_name.toLowerCase() === trimmed.toLowerCase() ||
                        (u.username && u.username.toLowerCase() === trimmed.toLowerCase())
                    );

                    const displayName = userMatch ? userMatch.full_name : trimmed;
                    rekap[displayName] = (rekap[displayName] || 0) + 1;
                });
            }
        });

        // 6. Join with local technician status
        const [statuses]: any = await (await import('@/lib/db')).default.query('SELECT * FROM technician_status');
        const statusMap = statuses.reduce((acc: any, s: any) => {
            acc[s.technician_name] = !!s.is_off_order;
            return acc;
        }, {});

        // Sort leaderboard and include status
        const sortedData = Object.entries(rekap)
            .map(([teknisi, count]) => ({
                teknisi,
                order: count,
                isOff: statusMap[teknisi] || false
            }))
            .sort((a, b) => b.order - a.order);

        const output = {
            date: dateISO,
            total_orders: totalOrder,
            total_teknisi: sortedData.length,
            leaderboard: sortedData.slice(0, 5),
            data: sortedData,
        };

        // Update cache if no specific date was requested
        if (!requestedDate) {
            cache = {
                data: output,
                timestamp: Date.now(),
            };
        }

        return NextResponse.json(output);

    } catch (error: any) {
        console.error('Monitoring API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
