import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        // Calculate offset time (-2 hours) in WIB
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const wibTime = new Date(utc + (3600000 * 7));

        // Subtract 2 hours
        wibTime.setHours(wibTime.getHours() - 2);

        const dayOfMonth = wibTime.getDate();
        const hours = wibTime.getHours();

        let shiftCode = 'P'; // Default Pagi (07.00 - 14.00)
        let jamLabel = '07.00 - 14.00 WIB';

        if (hours >= 14 && hours < 21) {
            shiftCode = 'S'; // Siang (14.00 - 21.00)
            jamLabel = '14.00 - 21.00 WIB';
        } else if (hours >= 21 || hours < 7) {
            shiftCode = 'M'; // Malam (21.00 - 07.00)
            jamLabel = '21.00 - 07.00 WIB';
        }

        // Fetch Service Desk roster table instead of dashboard
        const targetUrl = `https://piket.teknisirsdk.my.id/servicedesk`;

        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;

        // Find the table and rows
        const tableMatch = html.match(/<table[^>]*id="example3"[\s\S]*?>([\s\S]*?)<\/table>/);
        if (!tableMatch) {
            throw new Error('Could not find roster table');
        }

        const tableContent = tableMatch[1];
        const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
        const petugasList: string[] = [];

        for (const row of rows) {
            const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m: any) => m[1].trim());
            // Header row or non-data row
            if (cells.length < 32) continue;

            const nama = cells[0].replace(/<[^>]+>/g, '').trim();
            const shiftOnDay = cells[dayOfMonth].replace(/<[^>]+>/g, '').trim();

            if (shiftOnDay === shiftCode) {
                petugasList.push(nama);
            }
        }

        const serviceDesk = petugasList.length > 0 ? petugasList.join(', ') : 'Belum Terisi';

        // Format Date based on the 2-hour offset (wibTime)
        const hariTanggal = wibTime.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return NextResponse.json({
            serviceDesk,
            hariTanggal,
            jam: jamLabel,
            shiftFetched: shiftCode,
            dayOfMonth: dayOfMonth,
            offsetApplied: "-2 hours"
        });
    } catch (error: any) {
        console.error('Piket API Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch piket data: ' + error.message }, { status: 500 });
    }
}
