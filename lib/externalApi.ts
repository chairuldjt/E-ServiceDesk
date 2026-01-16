import { getWebminConfig } from './settings';

export async function getExternalToken() {
    const config = await getWebminConfig();

    if (!config || !config.user || !config.pass) {
        throw new Error('Koneksi belum disetting. Silakan cek menu Setting Webmin.');
    }

    const { user: USER, pass: PASS, base_url: BASE } = config;

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

        return { jwt, BASE };
    } catch (error: any) {
        if (error.message.includes('fetch')) {
            throw new Error('Gagal menghubungkan ke server. Periksa koneksi jaringan.');
        }
        throw error;
    }
}

export async function postExternalOrder(data: any) {
    const { jwt, BASE } = await getExternalToken();
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
