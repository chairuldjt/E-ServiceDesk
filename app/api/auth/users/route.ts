import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAdminAccess } from '@/lib/adminAuth';
import bcrypt from 'bcryptjs';

// GET all users
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAdminAccess();

    // Only admin can access this endpoint
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const connection = await pool.getConnection();
    const [rows]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
      'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    connection.release();

    return NextResponse.json({
      data: rows,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// CREATE new user
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAdminAccess();

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { username, email, password, role } = await request.json();

    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    // Check if email already exists
    const [existing]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute(
      'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role, true]
    );

    const [newUser]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
      'SELECT id, username, email, role, is_active, created_at FROM users WHERE email = ?',
      [email]
    );
    connection.release();

    return NextResponse.json(
      { message: 'User berhasil dibuat', data: newUser[0] },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat user' },
      { status: 500 }
    );
  }
}
