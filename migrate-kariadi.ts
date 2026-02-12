import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';

// Load environment variables
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

const {
    MYSQL_HOST,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE
} = process.env;

export async function up() {
    console.log('--- Migration Started ---');
    console.log(`Connecting to: ${MYSQL_HOST} as ${MYSQL_USER} using DB: ${MYSQL_DATABASE}`);

    let connection;
    try {
        connection = await mysql.createConnection({
            host: MYSQL_HOST,
            user: MYSQL_USER,
            password: MYSQL_PASSWORD,
            database: MYSQL_DATABASE
        });

        console.log(`✅ Connected to MySQL server`);

        // Check if columns exist
        const [columns]: any = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('kariadi_username', 'kariadi_password')
        `);

        const existingColumns = columns.map((c: any) => c.COLUMN_NAME);

        if (!existingColumns.includes('kariadi_username')) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN kariadi_username VARCHAR(100) DEFAULT NULL AFTER telegram_session
            `);
            console.log('Added kariadi_username column');
        } else {
            console.log('kariadi_username column already exists');
        }

        if (!existingColumns.includes('kariadi_password')) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN kariadi_password VARCHAR(255) DEFAULT NULL AFTER kariadi_username
            `);
            console.log('Added kariadi_password column');
        } else {
            console.log('kariadi_password column already exists');
        }

        console.log('Migration complete');
    } catch (error: any) {
        console.error('Migration failed:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

up();
