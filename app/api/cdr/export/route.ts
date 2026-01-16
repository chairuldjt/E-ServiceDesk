import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username dan password harus diisi' },
                { status: 400 }
            );
        }

        // URL Exporter PHP yang berada di jaringan yang sama dengan Divatel
        const EXPORTER_URL = "https://teknisirsdk.my.id/cdr/exporter.php";

        // Kirim kredensial ke exporter.php via POST
        const response = await axios.post(EXPORTER_URL,
            new URLSearchParams({
                user_export: username,
                pass_export: password
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                responseType: 'arraybuffer' // Untuk menerima file CSV/Binary
            }
        );

        const fileName = `CDR_${username}_${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(response.data, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            }
        });

    } catch (error: any) {
        console.error('Bridge Export Error:', error.message);
        return NextResponse.json(
            { error: 'Gagal menghubungi bridge exporter. Pastikan server teknisirsdk.my.id aktif.' },
            { status: 500 }
        );
    }
}
