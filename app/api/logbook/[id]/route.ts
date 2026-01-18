import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const connection = await pool.getConnection();
    const [rows]: any = await connection.execute(
      'SELECT * FROM logbook WHERE id = ?',
      [id]
    );
    connection.release();

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Logbook tidak ditemukan' },
        { status: 404 }
      );
    }

    const logbook = rows[0];

    // Check authorization
    if (payload.role !== 'admin' && logbook.user_id !== payload.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: logbook }, { status: 200 });
  } catch (error) {
    console.error('Get logbook detail error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { extensi, nama, lokasi, catatan, solusi, penyelesaian, status } = await request.json();

    const connection = await pool.getConnection();
    const [existingLogbook]: any = await connection.execute(
      'SELECT * FROM logbook WHERE id = ?',
      [id]
    );

    if (existingLogbook.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Logbook tidak ditemukan' },
        { status: 404 }
      );
    }

    const logbook = existingLogbook[0];

    // Check authorization
    if (payload.role !== 'admin' && logbook.user_id !== payload.id) {
      connection.release();
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connection.execute(
      'UPDATE logbook SET extensi = ?, nama = ?, lokasi = ?, catatan = ?, solusi = ?, penyelesaian = ?, status = ? WHERE id = ?',
      [
        extensi,
        nama,
        lokasi,
        catatan,
        solusi || logbook.solusi || 'belum ada',
        penyelesaian || logbook.penyelesaian || 'belum ada',
        status,
        id
      ]
    );

    const [updated]: any = await connection.execute(
      'SELECT * FROM logbook WHERE id = ?',
      [id]
    );
    connection.release();

    return NextResponse.json(
      { message: 'Logbook berhasil diupdate', data: updated[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayloadFromCookie();

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const connection = await pool.getConnection();
    const [existingLogbook]: any = await connection.execute(
      'SELECT * FROM logbook WHERE id = ?',
      [id]
    );

    if (existingLogbook.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Logbook tidak ditemukan' },
        { status: 404 }
      );
    }

    const logbook = existingLogbook[0];

    // Check authorization
    if (payload.role !== 'admin' && logbook.user_id !== payload.id) {
      connection.release();
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connection.execute('DELETE FROM logbook WHERE id = ?', [id]);
    connection.release();

    return NextResponse.json(
      { message: 'Logbook berhasil dihapus' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete logbook error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
