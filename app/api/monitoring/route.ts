import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.EXTERNAL_API_BASE || 'http://172.16.1.212:5010';
const USER = process.env.EXTERNAL_API_USER || 'mhafidz';
const PASS = process.env.EXTERNAL_API_PASS || '2023';

const STATUSES = [11, 12, 15, 30]; // followup, running, done, verify

// Simple in-memory cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const nocache = searchParams.get('nocache') === '1';
    const requestedDate = searchParams.get('date'); // YYYY-MM-DD

    if (!nocache && cache && (Date.now() - cache.timestamp) < CACHE_TTL && !requestedDate) {
        return NextResponse.json(cache.data);
    }

    try {
        // 1. Login
        const loginRes = await fetch(`${BASE}/secure/auth_validate_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: USER, pwd: PASS }),
        });

        if (!loginRes.ok) {
            throw new Error('Login failed');
        }

        // Capture cookies
        const setCookie = loginRes.headers.get('set-cookie');

        // 2. Get JWT
        const verifyRes = await fetch(`${BASE}/secure/verify`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Cookie': setCookie || '',
            },
        });

        if (!verifyRes.ok) {
            throw new Error('Verification failed');
        }

        const verifyData = await verifyRes.json();
        const jwt = verifyData.refresh_token;

        if (!jwt) {
            return NextResponse.json({ error: 'TOKEN NOT FOUND' }, { status: 401 });
        }

        // 3. Get Orders
        let allOrders: any[] = [];
        for (const status of STATUSES) {
            const orderRes = await fetch(`${BASE}/order/order_list_by_status/${status}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Accept': 'application/json',
                },
            });

            if (orderRes.ok) {
                const data = await orderRes.json();
                if (data.result && Array.isArray(data.result)) {
                    allOrders = [...allOrders, ...data.result];
                }
            }
        }

        // 4. Process Data
        const today = new Date();
        const dateToFilter = requestedDate ? new Date(requestedDate) : today;

        // PHP format: "d M y" (e.g., "16 Jan 26")
        // Let's be careful with date formatting
        const day = String(dateToFilter.getDate()).padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[dateToFilter.getMonth()];
        const year = String(dateToFilter.getFullYear()).slice(-2);
        const dateStringPHP = `${day} ${month} ${year}`;

        const dateISO = dateToFilter.toISOString().split('T')[0];

        const rekap: { [key: string]: number } = {};
        let totalOrder = 0;

        allOrders.forEach((o: any) => {
            if (o.create_date && o.create_date.includes(dateStringPHP)) {
                totalOrder++;

                const list = (o.teknisi || '').split('|');
                list.forEach((nama: string) => {
                    const trimmed = nama.trim();
                    if (trimmed === "") return;
                    rekap[trimmed] = (rekap[trimmed] || 0) + 1;
                });
            }
        });

        // Sort leaderboard
        const sortedData = Object.entries(rekap)
            .map(([teknisi, count]) => ({ teknisi, order: count }))
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
