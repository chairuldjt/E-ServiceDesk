
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';
import { getExternalUsers } from '@/lib/externalApi';

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || (payload.role !== 'admin' && payload.role !== 'super')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch users from external Webmin API using the current user's credentials
        let externalUsers = [];
        try {
            externalUsers = await getExternalUsers(payload.id);
        } catch (error: any) {
            return NextResponse.json({ error: `Gagal mengambil data dari Webmin: ${error.message}` }, { status: 500 });
        }

        if (!Array.isArray(externalUsers)) {
            return NextResponse.json({ error: 'Format data dari Webmin tidak valid' }, { status: 500 });
        }

        let addedCount = 0;
        let updatedCount = 0;

        // 2. Sync with local database
        for (const user of externalUsers) {
            // Mapping fields from external API to local DB with fallback options
            // Debug Log: console.log("User Row:", JSON.stringify(user));

            const webminId = user.user_id || user.id || user.webmin_id;
            const username = user.user_login || user.user_name || user.login || user.username || null;
            const fullName = user.nama_lengkap || user.name || user.full_name || user.nama;

            // Database lookup requires a unique identifier.
            // If username exists, we match by username.
            // If username is null, we should probably match by webmin_id if possible, or skip?
            // Currently our DB update logic relies on 'WHERE username = ?'.

            // Re-evaluating strategy: 
            // 1. Try to find user by webmin_id first (most stable ID).
            // 2. If not found, try by username (if exists).
            // 3. Update or Insert.

            if (webminId && fullName) {
                // Check by Webmin ID first (Primary External Key)
                const [existingById]: any = await pool.execute(
                    'SELECT id FROM webmin_users WHERE webmin_id = ?',
                    [webminId]
                );

                if (existingById.length > 0) {
                    await pool.execute(
                        'UPDATE webmin_users SET username = ?, full_name = ? WHERE webmin_id = ?',
                        [username, fullName, webminId]
                    );
                    updatedCount++;
                } else {
                    // If not found by ID, check by username (to avoid duplicates if ID changed but username same - unlikely but safe)
                    let foundByUsername = false;
                    if (username) {
                        const [existingByUser]: any = await pool.execute(
                            'SELECT id FROM webmin_users WHERE username = ?',
                            [username]
                        );
                        if (existingByUser.length > 0) {
                            // Found by username but ID is different? Update ID.
                            await pool.execute(
                                'UPDATE webmin_users SET webmin_id = ?, full_name = ? WHERE username = ?',
                                [webminId, fullName, username]
                            );
                            foundByUsername = true;
                            updatedCount++; // Or treat as update
                        }
                    }

                    if (!foundByUsername) {
                        await pool.execute(
                            'INSERT INTO webmin_users (webmin_id, username, full_name) VALUES (?, ?, ?)',
                            [webminId, username, fullName]
                        );
                        addedCount++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync selesai. Total Fetched: ${externalUsers.length}. Ditambahkan: ${addedCount}, Diupdate: ${updatedCount}`,
            added: addedCount,
            updated: updatedCount,
            totalFetched: externalUsers.length
        });

    } catch (error: any) {
        console.error('Sync Webmin Users Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
