import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
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
