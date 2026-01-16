import db from '@/lib/db';

export async function getWebminConfig() {
    try {
        const [rows]: any = await db.query(
            'SELECT value FROM settings WHERE id = "webmin_config"'
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

export async function saveWebminConfig(config: { user: string; pass: string; base_url: string }) {
    try {
        // Ensure table exists (simplified for this task)
        await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        const value = JSON.stringify(config);
        await db.query(
            'INSERT INTO settings (id, value) VALUES ("webmin_config", ?) ON DUPLICATE KEY UPDATE value = ?',
            [value, value]
        );
        return true;
    } catch (error) {
        console.error('Error saving webmin config:', error);
        throw error;
    }
}
