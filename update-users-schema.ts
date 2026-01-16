import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function updateSchema() {
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
