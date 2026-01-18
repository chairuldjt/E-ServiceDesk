import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        const response = await axios.get('https://piket.teknisirsdk.my.id/dashboard', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;

        // Extract content from <div id="salin">
        const salinMatch = html.match(/<div id="salin">([\s\S]*?)<\/div>/);
        if (!salinMatch) {
            return NextResponse.json({ error: 'Failed to find piket data' }, { status: 404 });
        }

        const salinContent = salinMatch[1];

        // Extract Date
        // Looking for "Hari ini: Sabtu, 17 Januari 2026"
        const dateMatch = salinContent.match(/Hari ini:\s*(.*?)\s*Jam/i);
        const hariTanggal = dateMatch ? dateMatch[1].trim() : 'Unknown';

        // Extract Jam
        // Looking for "Jam \n      14.00 sd 21.00"
        const jamMatch = salinContent.match(/Jam\s*([\d.]+)\s*sd\s*([\d.]+)/i);
        const jam = jamMatch ? `${jamMatch[1]} - ${jamMatch[2]} WIB` : '07.00 - 14.00 WIB';

        // Extract Service Desk names
        // Get the block between "Service Desk :" and "Teknisi :"
        const sdSectionMatch = salinContent.match(/Service Desk\s*:\s*<br>([\s\S]*?)(?:<br>\s*<br>|Teknisi\s*:)/i);
        let serviceDesk = 'Unknown';

        if (sdSectionMatch) {
            const sdSection = sdSectionMatch[1];
            // Match all names starting with - and before (phone number)
            const nameMatches = Array.from(sdSection.matchAll(/-\s*([^(<\n\r]+)/g));
            if (nameMatches.length > 0) {
                serviceDesk = nameMatches.map((m: any) => m[1].trim()).join(', ');
            }
        }

        return NextResponse.json({
            serviceDesk,
            hariTanggal,
            jam,
            raw: salinContent
        });
    } catch (error: any) {
        console.error('Piket API Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch piket data' }, { status: 500 });
    }
}
