import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envPath });

async function resetAdmin() {
    const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;

    console.log(`Attempting to reset admin password for database: ${MYSQL_DATABASE}`);

    try {
        const connection = await mysql.createConnection({
            host: MYSQL_HOST,
            user: MYSQL_USER,
            password: MYSQL_PASSWORD,
            database: MYSQL_DATABASE
        });

        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result]: any = await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ? OR username = ?',
            [hashedPassword, 'admin@eservicedesk.com', 'admin']
        );

        if (result.affectedRows > 0) {
            console.log('✅ Success! Admin password has been reset to: admin123');
            console.log('You can now login with:');
            console.log('Email: admin@eservicedesk.com');
            console.log('Password: admin123');
        } else {
            console.log('❌ Error: Admin user not found in database.');
        }

        await connection.end();
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
    process.exit(0);
}

resetAdmin();
