
import { NextRequest, NextResponse } from 'next/server';
import { kariadiFetch } from '@/lib/kariadiApi';
import { getKariadiCredentials } from '@/lib/kariadiHelper';

export async function POST(request: NextRequest) {
    try {
        const auth = await getKariadiCredentials();
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
        }

        const body = await request.json();
        const { id, actionUrl, title, message } = body;

        if (!id || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let endpoint = actionUrl || '/features/notif/send';

        // Handle full URL if provided
        if (endpoint.includes('://')) {
            try {
                const urlObj = new URL(endpoint);
                const fullPath = urlObj.pathname + urlObj.search;
                // kariadiFetch adds /KariadiMobile/panel base
                if (fullPath.includes('/KariadiMobile/panel')) {
                    endpoint = fullPath.replace('/KariadiMobile/panel', '');
                } else {
                    endpoint = fullPath;
                }
            } catch (e) {
                console.error("Endpoint parsing error", e);
            }
        }

        // Also handle partial paths starting with /KariadiMobile/panel
        if (endpoint.startsWith('/KariadiMobile/panel')) {
            endpoint = endpoint.replace('/KariadiMobile/panel', '');
        }

        const formData = new URLSearchParams();
        formData.append('inputUserID', body.id);
        formData.append('inputTitle', body.title);
        formData.append('inputMessage', body.message);

        const data = await kariadiFetch(endpoint, {
            method: 'POST',
            body: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: auth.credentials
        });

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Kariadi Notify Error:', error.message);
        return NextResponse.json({
            success: false,
            message: 'Failed to send notification. ' + error.message
        }, { status: 500 });
    }
}
