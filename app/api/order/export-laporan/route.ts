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
        const { searchParams } = new URL(request.url);
        const requestedDate = searchParams.get('date'); // YYYY-MM-DD
        const type = searchParams.get('type'); // 'json' or 'excel'
        const orderNos = searchParams.get('order_nos')?.split(',').filter(id => id.trim() !== ''); // comma separated order numbers

        const { jwt, BASE } = await getExternalToken(payload.id);

        // 1. Fetch orders from all statuses
        const fetchStatus = async (status: number) => {
            const orderRes = await fetch(`${BASE}/order/order_list_by_status/${status}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'access-token': jwt,
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

        // 2. Filter by Date & Shift Logic (WIB)
        const nowServer = new Date();
        const utcServer = nowServer.getTime() + (nowServer.getTimezoneOffset() * 60000);
        const nowWIB = new Date(utcServer + (3600000 * 7));
        const currentWIBDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(nowServer);
        const currentHourWIB = nowWIB.getHours();

        const getLocalShiftDate = (ds: string) => {
            const [y, m, d] = ds.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const filterDate = requestedDate ? getLocalShiftDate(requestedDate) : nowWIB;
        const requestedDateISO = requestedDate || currentWIBDate;

        const monthsStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const getPHPFormat = (d: Date) => {
            const day = String(d.getDate()).padStart(2, '0');
            const monthShort = monthsStr[d.getMonth()];
            const yearShort = String(d.getFullYear()).slice(-2);
            return `${day} ${monthShort} ${yearShort}`;
        };

        const targetDates = [requestedDateISO];
        const targetPHPDates = [getPHPFormat(filterDate)];

        // If today is requested and it's before 07:00 WIB, include yesterday
        if (requestedDate === currentWIBDate && currentHourWIB < 7) {
            const yesterday = new Date(filterDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(yesterday);
            targetDates.push(yesterdayISO);
            targetPHPDates.push(getPHPFormat(yesterday));
        }

        allOrders = allOrders.filter((o: any) => {
            const matchesDate = targetPHPDates.some(phpDate => o.create_date && o.create_date.includes(phpDate)) ||
                targetDates.some(isoDate => o.create_date && o.create_date.includes(isoDate));

            if (!matchesDate) return false;

            if (orderNos && orderNos.length > 0) {
                return orderNos.includes(String(o.order_no));
            }

            return true;
        });

        // 2.5 Sort by create_date (Earliest first)
        allOrders.sort((a: any, b: any) => {
            const getSortable = (s: string) => {
                if (!s) return '';
                if (s.includes(' - ')) {
                    const [datePart, timePart] = s.split(' - ');
                    const parts = datePart.split(' ');
                    if (parts.length === 3) {
                        const [d, mStr, y] = parts;
                        const m = monthsStr.indexOf(mStr);
                        return `20${y}-${String(m + 1).padStart(2, '0')}-${d.padStart(2, '0')} ${timePart}`;
                    }
                }
                return s.replace('T', ' ');
            };
            const sortA = getSortable(a.create_date);
            const sortB = getSortable(b.create_date);
            return sortA.localeCompare(sortB);
        });

        // 2.6 Return JSON if requested
        if (type === 'json') {
            return NextResponse.json({ data: allOrders }, { status: 200 });
        }

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
        let dateTitle = `${filterDate.getDate()} ${monthsFull[filterDate.getMonth()]} ${filterDate.getFullYear()}`;
        let filenameDate = requestedDateISO;

        if (targetDates.length > 1) {
            // If before 07:00 WIB shift logic is active, use Yesterday as the report date
            const prevDate = getLocalShiftDate(targetDates[1]);
            dateTitle = `${prevDate.getDate()} ${monthsFull[prevDate.getMonth()]} ${prevDate.getFullYear()}`;
            filenameDate = targetDates[1];
        }

        // Add Title
        worksheet.insertRow(1, []);
        worksheet.mergeCells('A2:I2');
        const titleCell = worksheet.getCell('A2');
        titleCell.value = `LAPORAN ORDER SIMRS TANGGAL ${dateTitle}`.toUpperCase();
        titleCell.font = { bold: true, size: 14 };
        // Apply alignment to the entire merged range
        for (let i = 1; i <= 9; i++) {
            worksheet.getRow(2).getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Move headers to Row 4 (leaving Row 3 empty as spacing)
        const headerRow = worksheet.getRow(4);
        headerRow.values = ['NO', 'NO ORDER', 'TANGGAL', 'TELEPON', 'USER', 'ORDER', 'SERVICE DESK', 'KETERANGAN', 'TEKNISI'];
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
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

            row.eachCell((cell, colNumber) => {
                const shouldCenter = [1, 2, 3, 4, 7, 8].includes(colNumber);
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: shouldCenter ? 'center' : 'left',
                    wrapText: true
                };

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

        // Final cleanup - Removed global alignment adjustment to avoid overwriting cell-level settings

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="laporan-jaga-${filenameDate}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error: any) {
        console.error('Export Excel Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
