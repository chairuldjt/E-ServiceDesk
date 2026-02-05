import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

// GET all logbook entries for the user
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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD

    let query = 'SELECT * FROM logbook';
    const params: any[] = [];

    // Semua user (termasuk admin) hanya melihat logbook mereka sendiri
    query += ' WHERE user_id = ?';
    params.push(payload.id);

    if (date) {
      query += ' AND DATE(created_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await connection.execute(query, params);
    connection.release();

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    console.error('Get logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// CREATE new logbook entry (Supports single or bulk)
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const isBulk = Array.isArray(body);
    const entries = isBulk ? body : [body];

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const createdIds = [];
      for (const entry of entries) {
        const { extensi, nama, lokasi, catatan, solusi, penyelesaian } = entry;

        if (!extensi || !nama || !lokasi) {
          throw new Error('Extensi, nama, dan lokasi harus diisi');
        }

        const [result] = await connection.execute(
          'INSERT INTO logbook (user_id, extensi, nama, lokasi, catatan, solusi, penyelesaian, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            payload.id,
            extensi,
            nama,
            lokasi,
            catatan || null,
            solusi || 'belum ada',
            penyelesaian || 'belum ada',
            'pending_order' // Default is now 'Belum Diorderkan'
          ]
        );
        createdIds.push((result as any).insertId);
      }

      await connection.commit();
      connection.release();

      return NextResponse.json(
        { message: `${entries.length} Catatan berhasil dibuat`, ids: createdIds },
        { status: 201 }
      );
    } catch (error: any) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { error: error.message || 'Gagal membuat logbook' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Create logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
// BULK DELETE logbook entries
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if all entries belong to the user or if user is admin
      if (payload.role !== 'admin') {
        const [rows]: any = await connection.query(
          'SELECT COUNT(*) as count FROM logbook WHERE id IN (?) AND user_id != ?',
          [ids, payload.id]
        );
        if (rows[0].count > 0) {
          throw new Error('Beberapa data bukan milik Anda');
        }
      }

      await connection.query('DELETE FROM logbook WHERE id IN (?)', [ids]);

      await connection.commit();
      connection.release();

      return NextResponse.json(
        { message: `${ids.length} data berhasil dihapus` },
        { status: 200 }
      );
    } catch (error: any) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      return NextResponse.json(
        { error: error.message || 'Gagal menghapus data' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Bulk delete logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
