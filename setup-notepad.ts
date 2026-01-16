import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupNotepad() {
    try {
        const pool = (await import('./lib/db')).default;
        const connection = await pool.getConnection();

        console.log('Creating notes table...');

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        color VARCHAR(50) DEFAULT 'white',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        console.log('Notes table created successfully!');

        connection.release();
    } catch (error) {
        console.error('Error setting up notepad:', error);
    }

    process.exit(0);
}

setupNotepad();
