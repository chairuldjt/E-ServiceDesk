import bcrypt from 'bcryptjs';
import pool from './lib/db';

async function seedAdmin() {
  try {
    const connection = await pool.getConnection();

    // Check if admin already exists
    const [existing]: any = await connection.execute( // eslint-disable-line @typescript-eslint/no-explicit-any
      'SELECT * FROM users WHERE email = ?',
      ['admin@eservicedesk.com']
    );

    if (existing.length > 0) {
      console.log('Admin user already exists');
      connection.release();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@eservicedesk.com', hashedPassword, 'admin']
    );

    console.log('Admin user created successfully!');
    console.log('Email: admin@eservicedesk.com');
    console.log('Password: admin123');

    connection.release();
  } catch (error) {
    console.error('Error seeding admin:', error);
  }

  process.exit(0);
}

seedAdmin();
