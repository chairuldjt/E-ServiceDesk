import { NextResponse } from 'next/server';
import { getExternalCatalogs, getExternalUsers } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET() {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [catalogs, users] = await Promise.all([
            getExternalCatalogs(payload.id),
            getExternalUsers(payload.id)
        ]);

        return NextResponse.json({ catalogs, users });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
