import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        // Calculate current WIB time
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const wibTime = new Date(utc + (3600000 * 7));

        const hours = wibTime.getHours();
        const minutes = wibTime.getMinutes();
        const totalMinutes = (hours * 60) + minutes;

        let targetDate = new Date(wibTime);
        let shiftCodes: string[] = [];
        let jamLabel = '';

        /**
         * Shift Logic:
         * 21:30 - 23:59 > shift M hari ini
         * 00:00 - 07:30 > shift M hari sebelumnya
         * 07:30 - 14:30 > shift P dan RK hari ini
         * 14:30 - 21:30 > shift S hari ini
         */
        if (totalMinutes < (7 * 60 + 30)) {
            // 00:00 - 07:30: shift M hari sebelumnya
            targetDate.setDate(targetDate.getDate() - 1);
            shiftCodes = ['M'];
            jamLabel = '21.00 - 07.00 WIB';
        } else if (totalMinutes < (14 * 60 + 30)) {
            // 07:30 - 14:30: shift P dan RK hari ini
            shiftCodes = ['P', 'RK'];
            jamLabel = '07.00 - 14.00 WIB';
        } else if (totalMinutes < (21 * 60 + 30)) {
            // 14:30 - 21:30: shift S hari ini
            shiftCodes = ['S'];
            jamLabel = '14.00 - 21.00 WIB';
        } else {
            // 21:30 - 23:59: shift M hari ini
            shiftCodes = ['M'];
            jamLabel = '21.00 - 07.00 WIB';
        }

        const dayToLookup = targetDate.getDate().toString();

        // Fetch Service Desk roster JSON API
        const targetUrl = `https://piket.teknisirsdk.my.id/api/schedule/servicedesk`;

        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        const data = response.data.data;
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid response structure from schedule API');
        }

        const petugasList: string[] = [];

        for (const item of data) {
            const shiftOnDay = item[dayToLookup];

            if (shiftCodes.includes(shiftOnDay)) {
                petugasList.push(item.name);
            }
        }

        const serviceDesk = petugasList.length > 0 ? petugasList.join(', ') : 'Belum Terisi';

        // Format Date based on the targetDate
        const hariTanggal = targetDate.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return NextResponse.json({
            serviceDesk,
            hariTanggal,
            jam: jamLabel,
            shiftFetched: shiftCodes.join(', '),
            dayOfMonth: parseInt(dayToLookup),
            currentTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            isPreviousDay: targetDate.getDate() !== wibTime.getDate()
        });
    } catch (error: any) {
        console.error('Piket API Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch piket data: ' + error.message }, { status: 500 });
    }
}
