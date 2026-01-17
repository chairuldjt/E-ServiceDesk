import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrdersByStatus, postExternalVerify, getExternalOrderDetail, getExternalOrderHistory } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getWebminConfig } from '@/lib/settings';
import { EXTERNAL_USERS } from '@/lib/constants';

export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = parseInt(searchParams.get('status') || '11');

        const config = await getWebminConfig(payload.id);
        if (!config || !config.user || !config.pass) {
            return NextResponse.json({
                error: '🔌 Kredensial Webmin belum dikonfigurasi. Silakan ke menu Settings → Account Setting untuk menghubungkan akun Anda.'
            }, { status: 400 });
        }

        // 1. Get List of Orders by Status
        const data = await getExternalOrdersByStatus(payload.id, status);
        return NextResponse.json({ result: data });
    } catch (error: any) {
        console.error('Verify List API Error:', error);

        // Provide user-friendly error messages
        if (error.message.includes('Gagal periksa User/PW')) {
            return NextResponse.json({
                error: 'Username atau Password Webmin salah. Silakan periksa kembali di menu Settings.'
            }, { status: 401 });
        }

        if (error.message.includes('Gagal menghubungkan')) {
            return NextResponse.json({
                error: 'Tidak dapat terhubung ke server eksternal. Periksa koneksi jaringan atau coba lagi nanti.'
            }, { status: 503 });
        }

        return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { order_id, status_code, faq_note, note } = body;

        if (!order_id || !status_code) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auto-detect Admin/User ID for update_by from Webmin Username
        const config = await getWebminConfig(payload.id);
        if (!config || !config.user) {
            return NextResponse.json({ error: 'Koneksi Webmin belum disetting.' }, { status: 400 });
        }

        const externalUser = EXTERNAL_USERS.find(u => u.login === config.user);
        if (!externalUser) {
            return NextResponse.json({ error: `User Webmin '${config.user}' tidak terdaftar.` }, { status: 400 });
        }

        const verifyPayload = {
            order_id,
            status_code: status_code.toString(),
            faq_note: faq_note || "",
            note: note || "",
            update_by: externalUser.id
        };

        const result = await postExternalVerify(payload.id, verifyPayload);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Verify Submit API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
