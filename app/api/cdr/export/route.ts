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
                pass_export: password,
                field_name: 'dst',
                field_pattern: '2000'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                responseType: 'arraybuffer'
            }
        );

        // Konversi CSV ke Excel menggunakan XLSX
        const csvContent = response.data.toString('utf-8');
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(csvContent, { type: 'string' });

        // Format kolom date ke format YYYY-MM-DD HH:mm:ss
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length > 0) {
            // Cari index kolom 'date'
            const headers = jsonData[0];
            const dateIndex = headers.findIndex((h: string) =>
                h && h.toLowerCase().trim() === 'date'
            );

            if (dateIndex !== -1) {
                // Format setiap baris data (skip header)
                for (let i = 1; i < jsonData.length; i++) {
                    if (jsonData[i][dateIndex]) {
                        const dateValue = jsonData[i][dateIndex];

                        // Jika sudah dalam format Date object dari Excel
                        if (typeof dateValue === 'number') {
                            const date = XLSX.SSF.parse_date_code(dateValue);
                            jsonData[i][dateIndex] = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')} ${String(date.H).padStart(2, '0')}:${String(date.M).padStart(2, '0')}:${String(date.S).padStart(2, '0')}`;
                        }
                        // Jika dalam format string, parse dan format ulang
                        else if (typeof dateValue === 'string') {
                            const parsedDate = new Date(dateValue);
                            if (!isNaN(parsedDate.getTime())) {
                                const year = parsedDate.getFullYear();
                                const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                                const day = String(parsedDate.getDate()).padStart(2, '0');
                                const hours = String(parsedDate.getHours()).padStart(2, '0');
                                const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
                                const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
                                jsonData[i][dateIndex] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                            }
                        }
                    }
                }

                // Buat worksheet baru dengan data yang sudah diformat
                const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
                workbook.Sheets[sheetName] = newWorksheet;
            }
        }

        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });

        const fileName = `CDR_${username}_${new Date().toISOString().slice(0, 10)}.xls`;

        return new NextResponse(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.ms-excel',
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
