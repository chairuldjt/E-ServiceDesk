import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import bcrypt from 'bcryptjs';

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
                role ENUM('user', 'admin', 'super') DEFAULT 'user',
                is_active TINYINT(1) DEFAULT 1,
                profile_image VARCHAR(255) DEFAULT NULL,
                telegram_session TEXT DEFAULT NULL,
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
                status ENUM('draft', 'pending_order', 'ordered', 'completed') DEFAULT 'draft',
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
                content LONGTEXT,
                color VARCHAR(50) DEFAULT 'white',
                is_pinned TINYINT(1) DEFAULT 0,
                is_public TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "notes" ready');

        // Technician Status Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS technician_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                technician_name VARCHAR(255) UNIQUE NOT NULL,
                is_off_order TINYINT(1) DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "technician_status" ready');

        // Chat Sessions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) DEFAULT 'New Chat',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "chat_sessions" ready');

        // Chat Messages Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                role ENUM('user', 'assistant') NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "chat_messages" ready');

        // Timeline Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS timeline (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                content TEXT,
                images TEXT,
                privacy ENUM('public', 'private') DEFAULT 'public',
                is_pinned TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "timeline" ready');

        // Timeline Likes Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS timeline_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_like (post_id, user_id),
                FOREIGN KEY (post_id) REFERENCES timeline(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "timeline_likes" ready');

        // Timeline Comments Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS timeline_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES timeline(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "timeline_comments" ready');

        // Notifications Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                sender_id INT,
                type ENUM('mention', 'system', 'github') NOT NULL,
                message TEXT NOT NULL,
                link VARCHAR(255),
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "notifications" ready');

        // Step 3.5: Migration - Check for missing columns
        console.log('Checking for schema updates...');

        // Update logbook status enum
        console.log('   - Updating "logbook" status ENUM...');
        try {
            await connection.query("ALTER TABLE logbook MODIFY COLUMN status ENUM('draft', 'pending_order', 'ordered', 'completed') DEFAULT 'draft'");
            console.log('   - Status ENUM updated successfully');
        } catch (e: any) {
            console.log('   - Skipping status ENUM update (maybe already updated)');
        }

        // Update content to LONGTEXT if it's still TEXT
        console.log('   - Ensuring "content" in "notes" is LONGTEXT...');
        await connection.query('ALTER TABLE notes MODIFY COLUMN content LONGTEXT');

        const [columns]: any = await connection.query('SHOW COLUMNS FROM notes');
        const hasIsPublic = columns.some((col: any) => col.Field === 'is_public');
        if (!hasIsPublic) {
            console.log('   - Adding missing "is_public" column to "notes" table...');
            await connection.query('ALTER TABLE notes ADD COLUMN is_public TINYINT(1) DEFAULT 0 AFTER color');
            console.log('   - Column "is_public" added successfully');
        }

        const hasIsPinned = columns.some((col: any) => col.Field === 'is_pinned');
        if (!hasIsPinned) {
            console.log('   - Adding missing "is_pinned" column to "notes" table...');
            await connection.query('ALTER TABLE notes ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 AFTER color');
            console.log('   - Column "is_pinned" added successfully');
        }

        const [userColumns]: any = await connection.query('SHOW COLUMNS FROM users');
        const hasProfileImage = userColumns.some((col: any) => col.Field === 'profile_image');
        if (!hasProfileImage) {
            console.log('   - Adding missing "profile_image" column to "users" table...');
            await connection.query('ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER is_active');
            console.log('   - Column "profile_image" added successfully');
        }

        const hasTelegramSession = userColumns.some((col: any) => col.Field === 'telegram_session');
        if (!hasTelegramSession) {
            console.log('   - Adding missing "telegram_session" column to "users" table...');
            await connection.query('ALTER TABLE users ADD COLUMN telegram_session TEXT DEFAULT NULL AFTER profile_image');
            console.log('   - Column "telegram_session" added successfully');
        }

        const hasImages = columns.some((col: any) => col.Field === 'images');
        if (!hasImages) {
            console.log('   - Adding missing "images" column to "notes" table...');
            await connection.query('ALTER TABLE notes ADD COLUMN images TEXT DEFAULT NULL AFTER content');
            console.log('   - Column "images" added successfully');
        }

        // Update role enum to include 'super'
        console.log('   - Updating "users" role ENUM to include "super"...');
        try {
            await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super') DEFAULT 'user'");
            console.log('   - Role ENUM updated successfully');
        } catch (e: any) {
            console.log('   - Skipping role ENUM update (maybe already updated)');
        }

        // Step 4: Seed Admin User
        console.log('Seeding admin user...');
        const [adminExists]: any = await connection.query('SELECT id FROM users WHERE username = "admin" OR email = "admin@logbook.com"');

        if (adminExists.length === 0) {
            const adminPassword = 'admin123';
            const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
            await connection.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@logbook.com', adminPasswordHash, 'admin']
            );
            console.log(`✅ Admin user created (admin@logbook.com / ${adminPassword})`);
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
