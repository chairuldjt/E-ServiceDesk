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

const EXTERNAL_USERS = [
    { id: 7, login: "dale", name: "DaleHabiby" },
    { id: 8, login: "dadi", name: "Dadi Susanto" },
    { id: 12, login: "agman", name: "agman" },
    { id: 13, login: "mek", name: "Mike Kumara Adhitama" },
    { id: 14, login: "guntur", name: "guntur pahlawan" },
    { id: 15, login: "trimardiati", name: "tri mardiati" },
    { id: 16, login: "cutmutia", name: "Cut mutia" },
    { id: 17, login: "rifki", name: "Rifki" },
    { id: 18, login: "nova", name: "Nova Oktaviani Hadinata" },
    { id: 20, login: "ken", name: "Ken Sutejo Widyantoro" },
    { id: 22, login: "dina", name: "Dina Fina Aulia" },
    { id: 23, login: null, name: "Adit Setiawan" },
    { id: 24, login: "joko", name: "Joko Wimpuno" },
    { id: 29, login: null, name: "Muhammad Hanif Zuhri" },
    { id: 31, login: "fitri", name: "Fitri Yuliasanti" },
    { id: 33, login: "arifin", name: "Arifin" },
    { id: 34, login: "adjisugiyanto", name: "Adji Sugiyanto" },
    { id: 35, login: null, name: "Adhi" },
    { id: 38, login: "iwan", name: "Iwan apriyanto" },
    { id: 39, login: "heru", name: "Heru Haryanto" },
    { id: 41, login: "yosep", name: "Yosep AW" },
    { id: 42, login: "lukman", name: "Lukman" },
    { id: 47, login: "mita", name: "Mita" },
    { id: 48, login: null, name: "Lanang Rizky" },
    { id: 49, login: "balam", name: "Balam Proyoga" },
    { id: 50, login: null, name: "Eruidf" },
    { id: 54, login: "triadi", name: "Tri Adi" },
    { id: 55, login: null, name: "Bella" },
    { id: 57, login: "donyk", name: "Dony K" },
    { id: 58, login: null, name: "Nino" },
    { id: 61, login: null, name: "Arditya Rama Saputra" },
    { id: 62, login: null, name: "Ardian Adi Saputra" },
    { id: 63, login: null, name: "Quvonch" },
    { id: 64, login: "nugrohochairul", name: "Nugroho Chairul Djati" },
    { id: 65, login: null, name: "Ahmad Joni Siswanto" },
    { id: 67, login: null, name: "Farizky Juniarto Pratama" },
    { id: 69, login: null, name: "Memey" },
    { id: 70, login: "ridwanrisky", name: "Ridwan Risky R" },
    { id: 71, login: "prihanantojoko", name: "Prihananto Joko TL" },
    { id: 73, login: "mhafidz", name: "Mohammad Hafidz" },
    { id: 74, login: "naditacandra", name: "Nadita Candra" },
    { id: 75, login: "edorizky", name: "Edo rizky saputro" },
    { id: 76, login: "mhuda", name: "Miftakhul Huda" },
    { id: 77, login: "alimuhtas", name: "ALI MUHTAS" },
    { id: 78, login: "ryanaffandi", name: "Ryan Affandi Saputra" },
    { id: 79, login: "johantaufik", name: "Johan Taufik" },
    { id: 80, login: "agusedy", name: "Agus Edy Cahyono" },
    { id: 81, login: "dessyannayumita", name: "Dessyanna Yumita Rachmawaty" },
    { id: 82, login: "afrizalrizqi", name: "Afrizal Rizqi Pranata" },
    { id: 83, login: "gilangheavy", name: "Gilang Heavy Pradana" },
    { id: 84, login: "agustadecky", name: "Agusta Decky Permana" },
    { id: 85, login: "arifjatmiko", name: "Arif Jatmiko" },
    { id: 86, login: "srihandayani", name: "Sri Handayani" },
    { id: 87, login: "tricahyani", name: "Tri cahyani atmojo" },
    { id: 89, login: "mokhammadiqbal", name: "Mokhammad Iqbal" },
    { id: 90, login: "wawan", name: "sulistyawan" },
    { id: 91, login: null, name: "Wawan" },
    { id: 92, login: null, name: "Caesar Kurnia Akbar" },
    { id: 93, login: null, name: "Anjas kusuma" },
    { id: 94, login: "adrianoyunas", name: "Adriano Yunas Supriyanto" },
    { id: 95, login: "windydwi", name: "Windy Dwi" }
];

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
                role VARCHAR(50) DEFAULT 'user',
                is_active TINYINT(1) DEFAULT 1,
                profile_image VARCHAR(255) DEFAULT NULL,
                telegram_session TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "users" ready');

        // Roles Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(255),
                color VARCHAR(50) DEFAULT 'indigo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "roles" ready');

        // Role Permissions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL,
                menu_path VARCHAR(255) NOT NULL,
                is_allowed TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_perm (role_id, menu_path),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "role_permissions" ready');

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

        // Webmin Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS webmin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                webmin_id INT NOT NULL,
                username VARCHAR(100) DEFAULT NULL,
                full_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   - Table "webmin_users" ready');

        // Check and Seed Webmin Users
        const [webminRows]: any = await connection.query('SELECT COUNT(*) as count FROM webmin_users');
        if (webminRows[0].count === 0) {
            console.log('   - Seeding webmin users...');
            for (const user of EXTERNAL_USERS) {
                if (user.login) {
                    try {
                        await connection.query(
                            'INSERT IGNORE INTO webmin_users (webmin_id, username, full_name) VALUES (?, ?, ?)',
                            [user.id, user.login, user.name]
                        );
                    } catch (err: any) {
                        console.log(`     Failed to insert ${user.login}: ${err.message}`);
                    }
                }
            }
            console.log('   - Webmin users seeded');
        } else {
            // Ensure windydwi exists or is updated
            try {
                const windydwi: any = EXTERNAL_USERS.find(u => u.login === 'windydwi');
                if (windydwi) {
                    await connection.query(
                        'INSERT INTO webmin_users (webmin_id, username, full_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE webmin_id = VALUES(webmin_id)',
                        [windydwi.id, windydwi.login, windydwi.name]
                    );
                    console.log(`   - Ensured windydwi has ID ${windydwi.id}`);
                }
            } catch (err) {
                console.log('Error updating windydwi:', err);
            }
        }

        // Step 3.5: Migration - Check for missing columns
        console.log('Checking for schema updates...');

        try {
            await connection.query("ALTER TABLE eservicedesk MODIFY COLUMN status ENUM('draft', 'pending_order', 'ordered', 'completed') DEFAULT 'draft'");
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

        const hasKariadiUser = userColumns.some((col: any) => col.Field === 'kariadi_username');
        if (!hasKariadiUser) {
            console.log('   - Adding missing "kariadi_username" column to "users" table...');
            await connection.query('ALTER TABLE users ADD COLUMN kariadi_username VARCHAR(100) DEFAULT NULL AFTER telegram_session');
            console.log('   - Column "kariadi_username" added successfully');
        }

        const hasKariadiPass = userColumns.some((col: any) => col.Field === 'kariadi_password');
        if (!hasKariadiPass) {
            console.log('   - Adding missing "kariadi_password" column to "users" table...');
            await connection.query('ALTER TABLE users ADD COLUMN kariadi_password VARCHAR(255) DEFAULT NULL AFTER kariadi_username');
            console.log('   - Column "kariadi_password" added successfully');
        }

        const hasImages = columns.some((col: any) => col.Field === 'images');
        if (!hasImages) {
            console.log('   - Adding missing "images" column to "notes" table...');
            await connection.query('ALTER TABLE notes ADD COLUMN images TEXT DEFAULT NULL AFTER content');
            console.log('   - Column "images" added successfully');
        }

        // Update role enum to VARCHAR to support dynamic roles
        console.log('   - Ensuring "users" role column is VARCHAR...');
        try {
            await connection.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'user'");
            console.log('   - Role column updated successfully');
        } catch (e: any) {
            console.log('   - Skipping role column update');
        }

        // Ensure color column in roles
        const [roleCols]: any = await connection.query('SHOW COLUMNS FROM roles');
        if (!roleCols.some((col: any) => col.Field === 'color')) {
            console.log('   - Adding "color" column to "roles" table...');
            await connection.query('ALTER TABLE roles ADD COLUMN color VARCHAR(50) DEFAULT "indigo"');
            console.log('   - Column "color" added successfully');
        }

        // Step 4: Seed Admin User
        console.log('Seeding admin user...');
        const [adminExists]: any = await connection.query('SELECT id FROM users WHERE username = "admin" OR email = "admin@logbook.com"');

        if (adminExists.length === 0) {
            const adminPassword = 'admin123';
            const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
            await connection.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@eservicedesk.com', adminPasswordHash, 'admin']
            );
            console.log(`✅ Admin user created (admin@eservicedesk.com / ${adminPassword})`);
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        // Step 5: Seed Default Roles
        console.log('Seeding default roles...');
        const [roleCount]: any = await connection.query('SELECT COUNT(*) as count FROM roles');
        if (roleCount[0].count === 0) {
            await connection.query("INSERT INTO roles (name, description, color) VALUES ('admin', 'System Administrator', 'purple'), ('user', 'Regular User', 'indigo'), ('moderator', 'Staff/Moderator', 'amber')");
            console.log('✅ Default roles seeded');

            // Seed basic permissions for admin
            const [adminRole]: any = await connection.query("SELECT id FROM roles WHERE name = 'admin'");
            if (adminRole.length > 0) {
                const adminId = adminRole[0].id;
                const menus = ['/dashboard', '/timeline', '/eservicedesk', '/monitoring', '/order', '/notepad', '/chatbot', '/whatsapp', '/telegram', '/admin'];
                for (const menu of menus) {
                    await connection.query("INSERT IGNORE INTO role_permissions (role_id, menu_path, is_allowed) VALUES (?, ?, 1)", [adminId, menu]);
                }
                console.log('✅ Admin permissions seeded');
            }
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
