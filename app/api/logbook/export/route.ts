import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import { write, utils } from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const connection = await pool.getConnection();
    let query = 'SELECT id, extensi, nama, lokasi, catatan, solusi, penyelesaian, status, created_at, updated_at FROM logbook';
    const params: any[] = [];

    // Admin dapat export semua logbook, user hanya logbook mereka sendiri
    if (payload.role !== 'admin') {
      query += ' WHERE user_id = ?';
      params.push(payload.id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows]: any = await connection.execute(query, params);
    connection.release();

    // Format data untuk Excel
    const formattedData = (rows as any[]).map((row, index) => ({
      'No': index + 1,
      'Extensi': row.extensi || '-',
      'Nama': row.nama || '-',
      'Lokasi': row.lokasi || '-',
      'Catatan': row.catatan || '-',
      'Solusi': row.solusi || '-',
      'Penyelesaian': row.penyelesaian || '-',
      'Status': row.status || '-',
      'Dibuat': new Date(row.created_at).toLocaleString('id-ID'),
      'Diupdate': new Date(row.updated_at).toLocaleString('id-ID'),
    }));

    // Buat workbook
    const ws = utils.json_to_sheet(formattedData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Logbook');

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 15 },  // Extensi
      { wch: 20 },  // Nama
      { wch: 20 },  // Lokasi
      { wch: 30 },  // Catatan
      { wch: 30 },  // Solusi
      { wch: 30 },  // Penyelesaian
      { wch: 12 },  // Status
      { wch: 20 },  // Dibuat
      { wch: 20 },  // Diupdate
    ];

    // Convert to buffer
    const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send response
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `logbook-export-${timestamp}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Export logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
