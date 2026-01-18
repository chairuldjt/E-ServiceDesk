import { NextRequest, NextResponse } from 'next/server';
import { getExternalToken } from '@/lib/externalApi';
import { getPayloadFromCookie } from '@/lib/jwt';
import ExcelJS from 'exceljs';

const STATUSES = [10, 11, 12, 15, 30]; // open, followup, running, done, verified

export async function GET(request: NextRequest) {
    const payload = await getPayloadFromCookie();
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { jwt, BASE } = await getExternalToken(payload.id);

        // 1. Fetch orders from all statuses
        const fetchStatus = async (status: number) => {
            const orderRes = await fetch(`${BASE}/order/order_list_by_status/${status}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Accept': 'application/json',
                },
            });
            if (orderRes.ok) {
                const data = await orderRes.json();
                return data.result && Array.isArray(data.result) ? data.result : [];
            }
            return [];
        };

        const results = await Promise.all(STATUSES.map(fetchStatus));
        let allOrders = results.flat();

        // 2. Filter by Today's Date
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const monthsStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthShort = monthsStr[today.getMonth()];
        const yearShort = String(today.getFullYear()).slice(-2);
        const dateStringPHP = `${day} ${monthShort} ${yearShort}`; // "19 Jan 26"

        // Also filter by ISO date just in case
        const dateISO = today.toISOString().split('T')[0];

        allOrders = allOrders.filter((o: any) => {
            return (o.create_date && o.create_date.includes(dateStringPHP)) ||
                (o.create_date && o.create_date.includes(dateISO));
        });

        // 3. Create Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Jaga');

        // Setup Columns
        worksheet.columns = [
            { header: 'NO', key: 'no', width: 5 },
            { header: 'NO ORDER', key: 'order_no', width: 15 },
            { header: 'TANGGAL', key: 'tanggal', width: 20 },
            { header: 'TELEPON', key: 'telepon', width: 15 },
            { header: 'USER', key: 'user', width: 30 },
            { header: 'ORDER', key: 'order', width: 40 },
            { header: 'SERVICE DESK', key: 'sd', width: 20 },
            { header: 'KETERANGAN', key: 'status', width: 15 },
            { header: 'TEKNISI', key: 'teknisi', width: 30 },
        ];

        // Format Date for Title
        const monthsFull = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const dateTitle = `${today.getDate()} ${monthsFull[today.getMonth()]} ${today.getFullYear()}`;

        // Add Title
        worksheet.insertRow(1, []);
        worksheet.mergeCells('A2:I2');
        const titleCell = worksheet.getCell('A2');
        titleCell.value = `LAPORAN ORDER SIMRS TANGGAL ${dateTitle}`.toUpperCase();
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.font = { bold: true, size: 14 };

        // Move headers to Row 4 (leaving Row 3 empty as spacing)
        const headerRow = worksheet.getRow(4);
        headerRow.values = ['NO', 'NO ORDER', 'TANGGAL', 'TELEPON', 'USER', 'ORDER', 'SERVICE DESK', 'KETERANGAN', 'TEKNISI'];
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F9FAFB' }
            };
        });

        // Add Data Rows
        allOrders.forEach((order: any, index: number) => {
            const teknisi = (order.teknisi || '').split('|').map((t: string) => t.trim()).filter((t: string) => t !== "").join('\n');
            const sd = order.order_by || '-';

            const row = worksheet.addRow([
                index + 1,
                order.order_no,
                order.create_date,
                order.ext_phone || 'Chat WA',
                order.location_desc,
                order.catatan,
                sd,
                order.status_desc.toUpperCase(),
                teknisi || '-'
            ]);

            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Add Footer
        const footerStartRow = worksheet.lastRow!.number + 2;

        // Left Side Footer (Mengetahui)
        worksheet.getCell(`B${footerStartRow}`).value = 'Mengetahui,';
        worksheet.getCell(`B${footerStartRow + 1}`).value = 'Kepala Instalasi SIMRS';

        // Right Side Footer (Semarang, Date)
        worksheet.getCell(`G${footerStartRow}`).value = `Semarang, ${dateTitle}`;
        worksheet.getCell(`G${footerStartRow + 1}`).value = 'Penjab Sarana & Prasarana';

        // Names & NIP
        const namesRow = footerStartRow + 5;
        worksheet.getCell(`B${namesRow}`).value = 'Mike Kumara Adhitama, S.Kom';
        worksheet.getCell(`B${namesRow}`).font = { bold: true, underline: true };
        worksheet.getCell(`B${namesRow + 1}`).value = 'NIP. 198006142006041013';

        worksheet.getCell(`G${namesRow}`).value = 'Prihananto Joko Tri Laksono, S.Kom';
        worksheet.getCell(`G${namesRow}`).font = { bold: true, underline: true };
        worksheet.getCell(`G${namesRow + 1}`).value = 'NIP. 198607142023211019';

        // Final Styles
        worksheet.eachRow((row) => {
            row.alignment = { ...row.alignment, vertical: 'middle' };
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="laporan-jaga-${dateISO}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error: any) {
        console.error('Export Excel Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
