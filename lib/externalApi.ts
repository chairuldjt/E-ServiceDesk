import { getWebminConfig } from './settings';

const BASE = process.env.EXTERNAL_API_BASE || 'http://172.16.1.212:5010';

// In-memory token cache (per user ID)
const tokenCache: { [key: number]: { jwt: string; expiry: number } } = {};
const TOKEN_TTL = 30 * 60 * 1000; // 30 minutes cache for JWT

export async function getExternalToken(userId: number) {
    const config = await getWebminConfig(userId);

    if (!config || !config.user || !config.pass) {
        throw new Error('Koneksi belum disetting. Silakan cek menu Setting Webmin.');
    }

    const { user: USER, pass: PASS } = config;

    // Check Cache
    const cached = tokenCache[userId];
    if (cached && cached.expiry > Date.now()) {
        return { jwt: cached.jwt, BASE };
    }

    try {
        // 1. Login
        const loginRes = await fetch(`${BASE}/secure/auth_validate_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: USER, pwd: PASS }),
        });

        if (!loginRes.ok) {
            throw new Error('Gagal periksa User/PW. Pastikan kredensial Webmin benar.');
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
            throw new Error('Verification with external API failed');
        }

        const verifyData = await verifyRes.json();
        const jwt = verifyData.refresh_token;

        if (!jwt) {
            throw new Error('JWT not found in external API response');
        }

        // Store in cache
        tokenCache[userId] = {
            jwt,
            expiry: Date.now() + TOKEN_TTL
        };

        return { jwt, BASE };
    } catch (error: any) {
        if (error.message.includes('fetch')) {
            throw new Error('Gagal menghubungkan ke server. Periksa koneksi jaringan.');
        }
        throw error;
    }
}

export async function postExternalOrder(userId: number, data: any) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_save`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`External API Error: ${errorText}`);
    }

    return await res.json();
}

export async function getExternalCatalogs(userId: number) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/service_catalog_list`, {
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
        },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
}

export async function getExternalUsers(userId: number) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/user/user_list`, {
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
        },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
}

export async function getExternalOrdersByStatus(userId: number, status: number) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_list_by_status/${status}`, {
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
        },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
}

export async function getExternalOrderDetail(userId: number, orderId: number) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_detail_by_id/${orderId}`, {
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
        },
    });

    if (!res.ok) throw new Error('Order detail not found');
    const data = await res.json();
    return data.result;
}

export async function postExternalVerify(userId: number, data: any) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_verified`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`External API Error: ${errorText}`);
    }

    return await res.json();
}

export async function getExternalOrderHistory(userId: number, orderId: number) {
    const { jwt } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_history_by_id/${orderId}`, {
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/json',
        },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
}
