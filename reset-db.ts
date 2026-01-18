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

async function resetDatabase() {
    console.log('--- Database Reset Started ---');
    console.log(`Connecting to: ${MYSQL_HOST} as ${MYSQL_USER}`);

    let connection;

    try {
        connection = await mysql.createConnection({
            host: MYSQL_HOST,
            user: MYSQL_USER,
            password: MYSQL_PASSWORD,
        });

        console.log(`✅ Connected to MySQL server`);

        console.log(`Dropping database "${MYSQL_DATABASE}"...`);
        await connection.query(`DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\``);
        console.log(`✅ Database "${MYSQL_DATABASE}" dropped`);

    } catch (error: any) {
        console.error('\n❌ Reset Failed:');
        console.error(error.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

resetDatabase();
