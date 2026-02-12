
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

        const params = new URLSearchParams();
        params.append('draw', body.draw || '1');
        params.append('start', body.start || '0');
        params.append('length', body.length || '10');
        params.append('search[value]', body.search?.value || '');
        params.append('search[regex]', body.search?.regex ? 'true' : 'false');

        if (body.order) {
            body.order.forEach((o: any, i: number) => {
                params.append(`order[${i}][column]`, o.column);
                params.append(`order[${i}][dir]`, o.dir);
            });
        }

        const data = await kariadiFetch('/users/verified', {
            method: 'POST',
            body: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: auth.credentials
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Kariadi Verified List Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch verified users' }, { status: 500 });
    }
}
