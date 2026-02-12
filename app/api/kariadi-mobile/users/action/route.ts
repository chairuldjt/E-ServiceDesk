
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
        const { action, id } = body;

        if (!action || !id) {
            return NextResponse.json({ error: 'Action and ID are required' }, { status: 400 });
        }

        let endpoint = '';
        switch (action) {
            case 'activate':
                endpoint = '/users/verify';
                break;
            case 'delete':
                endpoint = '/users/delete';
                break;
            case 'resend':
                endpoint = '/users/resend_otp';
                break;
            case 'update_patient':
                endpoint = '/users/update_patient';
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const formData = new URLSearchParams();
        formData.append('id', id);

        if (action === 'update_patient') {
            if (body.medical_record) formData.append('medical_record', body.medical_record);
            if (body.nik) formData.append('nik', body.nik);
        }

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
        console.error('Kariadi Action Error:', error.message);
        return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
    }
}
