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

async function initDatabase() {
    console.log('--- Database Initialization Started ---');
    console.log(`Connecting to: ${MYSQL_HOST} as ${MYSQL_USER}`);

    let connection;

    try {
        // Step 1: Connect to MySQL without database selection
        connection = await mysql.createConnection({
            host: MYSQL_HOST,
            user: MYSQL_USER,
            password: MYSQL_PASSWORD,
        });

        console.log(`✅ Connected to MySQL server`);

        // Step 2: Create Database
        console.log(`Creating database "${MYSQL_DATABASE}" if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\``);
        await connection.query(`USE \`${MYSQL_DATABASE}\``);
        console.log(`✅ Database "${MYSQL_DATABASE}" ready`);

        // Step 3: Create Tables
        console.log('Creating tables...');

        // Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "users" ready');

        // Logbook Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS logbook (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                extensi VARCHAR(100) NOT NULL,
                nama VARCHAR(255) NOT NULL,
                lokasi VARCHAR(255) NOT NULL,
                catatan TEXT,
                solusi TEXT,
                penyelesaian TEXT,
                status ENUM('draft', 'completed') DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "logbook" ready');

        // Notes Table
        await connection.query(`
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
        console.log('   - Table "notes" ready');

        // Step 4: Seed Admin User
        console.log('Seeding admin user...');
        const [adminExists]: any = await connection.query('SELECT id FROM users WHERE username = "admin" OR email = "admin@logbook.com"');

        if (adminExists.length === 0) {
            const adminPasswordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36Z5SrUm'; // Password: admin123
            await connection.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@logbook.com', adminPasswordHash, 'admin']
            );
            console.log('✅ Admin user created (admin@logbook.com / admin123)');
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        console.log('\n--- Database Initialization Complete ---');
        console.log('You can now run "npm run dev" to start the application.');

    } catch (error: any) {
        console.error('\n❌ Initialization Failed:');
        console.error(error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Tip: Check your MYSQL_USER and MYSQL_PASSWORD in .env.local');
        }
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

initDatabase();
