import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  console.log("DB HOST =", process.env.MYSQL_HOST);   // 👈 TAMBAHKAN INI
  try {
    const { email: identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/Email dan password harus diisi' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    connection.release();

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Username/Email atau password salah' },
        { status: 401 }
      );
    }

    const user = rows[0];

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Hubungi admin.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Username/Email atau password salah' },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: 'Login berhasil',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
