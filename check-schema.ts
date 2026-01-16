import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Robust environment loading
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

async function checkSchema() {
    console.log('Checking database with:');
    console.log(` - Host: ${process.env.MYSQL_HOST}`);
    console.log(` - User: ${process.env.MYSQL_USER}`);
    console.log(` - Database: ${process.env.MYSQL_DATABASE}`);

    try {
        const pool = (await import('./lib/db')).default;
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('DESCRIBE users');
        console.table(rows);
        connection.release();
    } catch (error) {
        console.error('Error describing table:', error);
    }
    process.exit(0);
}

checkSchema();
