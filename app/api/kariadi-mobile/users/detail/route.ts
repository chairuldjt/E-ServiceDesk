
import { NextRequest, NextResponse } from 'next/server';
import { kariadiFetch } from '@/lib/kariadiApi';
import { getKariadiCredentials } from '@/lib/kariadiHelper';

export async function GET(request: NextRequest) {
    try {
        const auth = await getKariadiCredentials();
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const data = await kariadiFetch(`/users/detail?id=${id}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: auth.credentials
        });

        return NextResponse.json({ html: data });
    } catch (error: any) {
        console.error('Kariadi Detail Fetch Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch user detail' }, { status: 500 });
    }
}
