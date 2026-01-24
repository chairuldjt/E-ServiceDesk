import pool from './db';

/**
 * Create notifications for mentioned users in content
 * @param content - The text content containing mentions
 * @param senderId - ID of the user who created the content
 * @param type - Type of notification (mention)
 * @param link - Link to the content
 */
export async function createMentionNotifications(
    content: string,
    senderId: number,
    type: 'mention' = 'mention',
    link: string
) {
    if (!content) return;

    // Extract all @mentions from content
    const mentionRegex = /@(\w+)/g;
    const matches = [...content.matchAll(mentionRegex)];

    if (matches.length === 0) return;

    const connection = await pool.getConnection();

    try {
        for (const match of matches) {
            const username = match[1].toLowerCase();

            // Handle @everyone
            if (username === 'everyone') {
                // Get all active users except sender
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const [users]: any[] = await connection.execute(
                    'SELECT id FROM users WHERE is_active = 1 AND id != ?',
                    [senderId]
                );

                for (const user of users) {
                    await connection.execute(
                        'INSERT INTO notifications (user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?)',
                        [user.id, senderId, type, 'Anda di-mention di sebuah postingan', link]
                    );
                }
            } else {
                // Get specific user
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const [users]: any[] = await connection.execute(
                    'SELECT id FROM users WHERE LOWER(username) = ? AND is_active = 1 AND id != ?',
                    [username, senderId]
                );

                if (users.length > 0) {
                    await connection.execute(
                        'INSERT INTO notifications (user_id, sender_id, type, message, link) VALUES (?, ?, ?, ?, ?)',
                        [users[0].id, senderId, type, `@${username} Anda di-mention di sebuah postingan`, link]
                    );
                }
            }
        }
    } catch (error) {
        console.error('Error creating mention notifications:', error);
    } finally {
        connection.release();
    }
}

/**
 * Create a system notification
 */
export async function createSystemNotification(
    userId: number,
    message: string,
    link?: string
) {
    const connection = await pool.getConnection();
    try {
        await connection.execute(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [userId, 'system', message, link || null]
        );
    } catch (error) {
        console.error('Error creating system notification:', error);
    } finally {
        connection.release();
    }
}

/**
 * Create a GitHub notification for all users
 */
export async function createGitHubNotification(
    message: string,
    link: string
) {
    const connection = await pool.getConnection();
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [users]: any[] = await connection.execute(
            'SELECT id FROM users WHERE is_active = 1'
        );

        for (const user of users) {
            await connection.execute(
                'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                [user.id, 'github', message, link]
            );
        }
    } catch (error) {
        console.error('Error creating GitHub notification:', error);
    } finally {
        connection.release();
    }
}
