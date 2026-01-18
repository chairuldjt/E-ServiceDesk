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
    let query = 'SELECT * FROM logbook';
    const params: any[] = [];

    // Semua user (termasuk admin) hanya melihat logbook mereka sendiri
    query += ' WHERE user_id = ?';
    params.push(payload.id);

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
    const logbooks = isBulk ? body : [body];

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const logbook of logbooks) {
        const { extensi, nama, lokasi, catatan, solusi, penyelesaian } = logbook;

        if (!extensi || !nama || !lokasi) {
          throw new Error('Extensi, nama, dan lokasi harus diisi');
        }

        await connection.execute(
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
      }

      await connection.commit();
      connection.release();

      return NextResponse.json(
        { message: `${logbooks.length} Logbook berhasil dibuat` },
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
