import axios from 'axios';

const KARIADI_BASE_URL = 'https://mobile.rskariadi.net/KariadiMobile/panel';

// In-memory session cache: username -> { cookie, expiry }
const sessionCache = new Map<string, { cookie: string, expiry: number }>();

export async function getKariadiSession(credentials: { username: string, password: string }) {
    const { username, password } = credentials;
    const cacheKey = username;
    const cached = sessionCache.get(cacheKey);

    // Check if we have a valid session (reuse for 1 hour to be safe)
    if (cached && Date.now() < cached.expiry) {
        return cached.cookie;
    }

    try {
        // console.log(`Logging in to Kariadi Mobile as ${username}...`);
        const response = await axios.post(`${KARIADI_BASE_URL}/cs`,
            new URLSearchParams({
                username: username,
                password: password,
                login: 'Login' // Some systems require the button name/value
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
            }
        );

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            const sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
            sessionCache.set(cacheKey, {
                cookie: sessionCookie,
                expiry: Date.now() + 60 * 60 * 1000 // 1 hour
            });
            return sessionCookie;
        }
        throw new Error('Failed to get session cookie from Kariadi');
    } catch (error: any) {
        console.error('Kariadi Login Error:', error.message);
        throw error;
    }
}

export async function kariadiFetch(path: string, options: any = {}) {
    const { credentials, ...fetchOptions } = options;

    if (!credentials || !credentials.username || !credentials.password) {
        throw new Error('MISSING_KARIADI_CREDENTIALS');
    }

    const cookie = await getKariadiSession(credentials);
    const url = `${KARIADI_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: any = {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...fetchOptions.headers,
    };

    // Extract CSRF token from cookie for POST requests if typical CI pattern
    if (fetchOptions.method === 'POST') {
        const csrfMatch = cookie.match(/ci_csrf_token=([^;]+)/);
        if (csrfMatch) {
            const csrfToken = csrfMatch[1];
            if (fetchOptions.body instanceof URLSearchParams) {
                fetchOptions.body.append('ci_csrf_token', csrfToken);
            } else if (typeof fetchOptions.body === 'string' && fetchOptions.body.includes('=')) {
                fetchOptions.body += `&ci_csrf_token=${csrfToken}`;
            }
        }
    }

    try {
        const response = await axios({
            url,
            method: fetchOptions.method || 'GET',
            headers,
            data: fetchOptions.body,
            params: fetchOptions.params,
            validateStatus: (status) => status >= 200 && status < 500, // Accept 4xx for manual handling if needed
        });
        return response.data;
    } catch (error: any) {
        console.error(`Kariadi API Error [${fetchOptions.method || 'GET'} ${path}]:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });

        if (error.response?.status === 401) {
            sessionCache.delete(credentials.username);
        }
        throw error;
    }
}
