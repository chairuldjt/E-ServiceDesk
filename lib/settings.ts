import db from '@/lib/db';

async function ensureTableExists() {
    try {
        // Attempt to create the table with the new schema if it doesn't exist
        await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50),
        user_id INT,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id, user_id)
      )
    `);

        // Check if user_id column exists (in case the table existed before with a different schema)
        const [columns]: any = await db.query('SHOW COLUMNS FROM settings LIKE "user_id"');
        if (columns.length === 0) {
            // Table exists but no user_id, let's fix it
            await db.query('ALTER TABLE settings ADD COLUMN user_id INT NOT NULL AFTER id');
            await db.query('ALTER TABLE settings DROP PRIMARY KEY, ADD PRIMARY KEY (id, user_id)');
        }
    } catch (error) {
        console.error('Error ensuring settings table exists:', error);
    }
}

export async function getWebminConfig(userId: number) {
    try {
        await ensureTableExists();
        const [rows]: any = await db.query(
            'SELECT value FROM settings WHERE id = ? AND user_id = ?',
            ['webmin_config', userId]
        );
        if (rows.length > 0) {
            return JSON.parse(rows[0].value);
        }
        return null;
    } catch (error) {
        console.error('Error fetching webmin config:', error);
        return null;
    }
}

export async function saveWebminConfig(userId: number, config: { user: string; pass: string; base_url: string }) {
    try {
        await ensureTableExists();
        const value = JSON.stringify(config);
        await db.query(
            'INSERT INTO settings (id, user_id, value) VALUES ("webmin_config", ?, ?) ON DUPLICATE KEY UPDATE value = ?',
            [userId, value, value]
        );
        return true;
    } catch (error) {
        console.error('Error saving webmin config:', error);
        throw error;
    }
}

export async function getSetting(id: string, userId: number = 0) {
    try {
        await ensureTableExists();
        const [rows]: any = await db.query(
            'SELECT value FROM settings WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        if (rows.length > 0) {
            try {
                return JSON.parse(rows[0].value);
            } catch {
                return rows[0].value;
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching setting ${id}:`, error);
        return null;
    }
}

export async function saveSetting(id: string, value: any, userId: number = 0) {
    try {
        await ensureTableExists();
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        await db.query(
            'INSERT INTO settings (id, user_id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?',
            [id, userId, stringValue, stringValue]
        );
        return true;
    } catch (error) {
        console.error(`Error saving setting ${id}:`, error);
        throw error;
    }
}

