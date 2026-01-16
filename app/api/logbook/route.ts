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

    // Admin dapat melihat semua logbook, user hanya logbook mereka sendiri
    if (payload.role !== 'admin') {
      query += ' WHERE user_id = ?';
      params.push(payload.id);
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

// CREATE new logbook entry
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { extensi, nama, lokasi, catatan, solusi, penyelesaian } = await request.json();

    if (!extensi || !nama || !lokasi) {
      return NextResponse.json(
        { error: 'Extensi, nama, dan lokasi harus diisi' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO logbook (user_id, extensi, nama, lokasi, catatan, solusi, penyelesaian, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [payload.id, extensi, nama, lokasi, catatan || null, solusi || null, penyelesaian || null, 'draft']
    );

    const [result]: any = await connection.execute(
      'SELECT * FROM logbook WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [payload.id]
    );
    connection.release();

    return NextResponse.json(
      { message: 'Logbook berhasil dibuat', data: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
