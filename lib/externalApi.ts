import { getWebminConfig } from './settings';

const DEFAULT_BASE = process.env.EXTERNAL_API_BASE || 'http://172.16.1.212:5010';
const FETCH_TIMEOUT = 30000; // 30 seconds timeout

// In-memory token cache (per user ID)
const tokenCache: { [key: number]: { jwt: string; expiry: number } } = {};
const TOKEN_TTL = 30 * 60 * 1000; // 30 minutes cache for JWT

// Timeout wrapper for fetch
function fetchWithTimeout(url: string, options: any = {}, timeout = FETCH_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout (${timeout}ms) for ${url}`)), timeout)
        )
    ]);
}

export async function getExternalToken(userId: number) {
    const config = await getWebminConfig(userId);

    if (!config || !config.user || !config.pass) {
        throw new Error('🔌 Kredensial Webmin belum dikonfigurasi. Silakan ke menu Settings → Account Setting untuk menghubungkan akun Anda.');
    }

    const { user: USER, pass: PASS } = config;

    const BASE = config.base_url || DEFAULT_BASE;

    // Check Cache
    const cached = tokenCache[userId];
    if (cached && cached.expiry > Date.now()) {
        return { jwt: cached.jwt, BASE };
    }

    try {
        // 1. Login
        const loginRes = await fetchWithTimeout(`${BASE}/secure/auth_validate_login`, {
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
        const verifyRes = await fetchWithTimeout(`${BASE}/secure/verify`, {
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
    const { jwt, BASE } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_save`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'access-token': jwt,
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
    const { jwt, BASE } = await getExternalToken(userId);
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
    const { jwt, BASE } = await getExternalToken(userId);
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
    const { jwt, BASE } = await getExternalToken(userId);
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
    const { jwt, BASE } = await getExternalToken(userId);
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
    const { jwt, BASE } = await getExternalToken(userId);
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
    const { jwt, BASE } = await getExternalToken(userId);
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

export async function getExternalOrderSummary(userId: number) {
    const { jwt, BASE } = await getExternalToken(userId);
    try {
        const res = await fetchWithTimeout(`${BASE}/redis/get_summary_order`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'access-token': jwt,
                'Accept': 'application/json',
            },
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.result;
    } catch (error) {
        console.error('Error fetching external summary:', error);
        return null;
    }
}

export async function postExternalOrderCancel(userId: number, data: any) {
    const { jwt, BASE } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/order_cancel`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'access-token': jwt,
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

export async function getExternalOrderAssignList(userId: number, orderId: number) {
    const { jwt, BASE } = await getExternalToken(userId);
    try {
        const res = await fetch(`${BASE}/secure/user_list`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'access-token': jwt,
                'Accept': 'application/json',
            },
        });

        if (!res.ok) {
            console.error('External API Error (User List):', await res.text());
            return [];
        }
        const data = await res.json();
        const users = data.result || data || [];

        if (!Array.isArray(users)) return [];

        // Return all users regardless of role (TEKNISI, ADMINISTRASI, CLIENT, etc.)
        return users
            .map((u: any) => ({
                teknisi_id: u.user_id,
                nama_lengkap: u.nama_lengkap,
                nama_bidang: u.role_name
            }));
    } catch (error) {
        console.error('Error in getExternalOrderAssignList:', error);
        return [];
    }
}

export async function postExternalAssignOrderSave(userId: number, data: any) {
    const { jwt, BASE } = await getExternalToken(userId);
    const res = await fetch(`${BASE}/order/assign_order_save`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'access-token': jwt,
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
