import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: 'e:/Project/xampp/htdocs/logbook/.env.local' });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    console.log('Migrating database...');
    try {
        // Add telegram_session column if it doesn't exist
        const [rows]: any = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'telegram_session'
    `, [process.env.MYSQL_DATABASE]);

        if (rows.length === 0) {
            console.log('Adding telegram_session column to users table...');
            await connection.execute('ALTER TABLE users ADD COLUMN telegram_session TEXT');
            console.log('Migration successful!');
        } else {
            console.log('telegram_session column already exists.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
