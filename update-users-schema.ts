import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Robust environment loading
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

async function updateSchema() {
    console.log('Connecting to database with:');
    console.log(` - Host: ${process.env.MYSQL_HOST}`);
    console.log(` - User: ${process.env.MYSQL_USER}`);
    console.log(` - Database: ${process.env.MYSQL_DATABASE}`);
    console.log(` - Password set: ${process.env.MYSQL_PASSWORD ? 'YES' : 'NO'}`);

    try {
        const pool = (await import('./lib/db')).default;
        const connection = await pool.getConnection();

        console.log('Adding is_active column...');
        try {
            await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER role
      `);
            console.log('Added is_active column successfully');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('is_active column already exists');
            } else {
                throw error;
            }
        }

        console.log('Schema update complete');
        connection.release();
    } catch (error) {
        console.error('Error updating schema:', error);
    }
    process.exit(0);
}

updateSchema();
