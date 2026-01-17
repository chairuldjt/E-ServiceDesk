import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import screenshot from 'screenshot-desktop';
import cron, { ScheduledTask } from 'node-cron';
import path from 'path';
import fs from 'fs';
const cronParser = require('cron-parser');

export type BotStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'READY' | 'LOADING';

interface BotState {
    status: BotStatus;
    qrCode: string | null;
    lastScreenshot: string | null;
    error: string | null;
    groupId: string | null;
    cronSchedule: string;
    nextRun: string | null;
    automationMode: 'SCREENSHOT' | 'IMAGE';
    autoImagePath: string | null;
}

declare global {
    var whatsappBot: {
        client: Client | null;
        state: BotState;
        job: ScheduledTask | null;
    } | undefined;
}

if (!global.whatsappBot) {
    global.whatsappBot = {
        client: null,
        state: {
            status: 'DISCONNECTED',
            qrCode: null,
            lastScreenshot: null,
            error: null,
            groupId: process.env.WA_GROUP_ID || null,
            cronSchedule: process.env.WA_CRON_SCHEDULE || 'STOP',
            nextRun: null,
            automationMode: 'SCREENSHOT',
            autoImagePath: fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'auto_image.png'))
                ? path.join(process.cwd(), 'public', 'uploads', 'auto_image.png')
                : null
        },
        job: null
    };
}

const bot = global.whatsappBot;

export const getBotState = () => bot.state;

export const initBot = async () => {
    // If client exists but is stuck in a bad state, clean it up
    if (bot.client) {
        if (bot.state.status === 'CONNECTING' || bot.state.status === 'LOADING') {
            console.log('Bot stuck in initializing state, restarting...');
            try {
                await bot.client.destroy();
            } catch (e) {
                console.error('Error destroying stuck client:', e);
            }
            bot.client = null;
        } else {
            console.log('Bot already initialized');
            return;
        }
    }

    bot.state.status = 'CONNECTING';

    try {
        bot.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(process.cwd(), '.wwebjs_auth')
            }),
            puppeteer: {
                headless: true, // Use headless for stability
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ],
                executablePath: process.env.CHROME_PATH || undefined,
            },
            // Using a stable web version to avoid the "markedUnread" error in latest WA Web
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            }
        });

        bot.client.on('qr', async (qr: string) => {
            bot.state.status = 'QR_CODE';
            try {
                bot.state.qrCode = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('Failed to generate QR code data URL', err);
            }
        });

        bot.client.on('ready', () => {
            bot.state.status = 'READY';
            bot.state.qrCode = null;
            console.log('WhatsApp Bot is ready!');
            setupCron();
        });

        bot.client.on('authenticated', () => {
            bot.state.status = 'LOADING';
            console.log('WhatsApp Bot authenticated');
        });

        bot.client.on('auth_failure', (msg: string) => {
            bot.state.status = 'DISCONNECTED';
            bot.state.error = `Auth failure: ${msg}`;
            console.error('WhatsApp Bot auth failure', msg);
        });

        bot.client.on('disconnected', (reason: string) => {
            bot.state.status = 'DISCONNECTED';
            console.log('WhatsApp Bot disconnected', reason);
            bot.state.cronSchedule = 'STOP';
            bot.state.nextRun = null;
            if (bot.job) {
                bot.job.stop();
                bot.job = null;
            }
            // Clear client instance on disconnect
            bot.client = null;
        });

        await bot.client.initialize();

        // Timeout watchdog: If not ready or QR within 40s, force reset
        setTimeout(() => {
            if (bot.client && (bot.state.status === 'CONNECTING' || bot.state.status === 'LOADING')) {
                console.warn('Bot initialization timed out, forcing reset...');
                stopBot(); // This destroys the client
                bot.state.status = 'DISCONNECTED';
                bot.state.error = 'Initialization timed out. Please try again.';
            }
        }, 40000);

    } catch (err: any) {
        bot.state.status = 'DISCONNECTED';
        bot.state.error = err.message;
        console.error('WhatsApp Bot initialization error', err);
        bot.client = null;
    }
};

export const logoutBot = async () => {
    if (bot.client && bot.state.status === 'READY') {
        try {
            console.log('Logging out from WhatsApp...');
            // Use destroy() instead of logout() - it's the correct method in whatsapp-web.js
            await bot.client.destroy();
        } catch (e) {
            console.error('Error logging out client', e);
        }
    }
    await stopBot();
};

export const stopBot = async () => {
    if (bot.client) {
        try {
            await bot.client.destroy();
        } catch (e) {
            console.error('Error destroying client', e);
        }
        bot.client = null;
        bot.state.status = 'DISCONNECTED';
        bot.state.cronSchedule = 'STOP';
        bot.state.nextRun = null;
        if (bot.job) {
            bot.job.stop();
            bot.job = null;
        }
    }
};

export const updateConfig = (
    groupId: string,
    schedule: string,
    mode: 'SCREENSHOT' | 'IMAGE' = 'SCREENSHOT',
    imagePath: string | null = null
) => {
    bot.state.groupId = groupId;
    bot.state.cronSchedule = schedule;
    bot.state.automationMode = mode;
    if (imagePath) bot.state.autoImagePath = imagePath;
    setupCron();
};

export const deleteAutoImage = () => {
    if (bot.state.autoImagePath && fs.existsSync(bot.state.autoImagePath)) {
        try {
            fs.unlinkSync(bot.state.autoImagePath);
        } catch (e) {
            console.error('Failed to delete auto image file:', e);
        }
    }
    bot.state.autoImagePath = null;
    // If we were in IMAGE mode, we might want to stop or notify
};

const setupCron = () => {
    try {
        if (bot.job) {
            console.log('Stopping existing cron job...');
            bot.job.stop();
            bot.job = null;
            bot.state.nextRun = null;
        }

        if (bot.state.status !== 'READY' || !bot.state.groupId) {
            console.log('Bot not ready or Group ID missing, skipping cron setup.');
            return;
        }

        const schedule = bot.state.cronSchedule;
        if (!schedule || schedule === 'custom' || schedule === 'STOP') {
            console.log('Cron schedule disabled or invalid:', schedule);
            return;
        }

        console.log(`Scheduling new cron job: "${schedule}", Mode: ${bot.state.automationMode}`);

        try {
            // Calculate initial next run
            const interval = cronParser.parseExpression(schedule);
            bot.state.nextRun = interval.next().toString();
        } catch (err: any) {
            console.error('Error parsing cron expression', err);
            bot.state.nextRun = `Error: ${err.message}`;
            return; // Do not proceed to schedule if invalid
        }

        bot.job = cron.schedule(schedule, async () => {
            console.log(`[${new Date().toLocaleString()}] Running scheduled task...`);

            // Update next run time
            try {
                const interval = cronParser.parseExpression(schedule);
                bot.state.nextRun = interval.next().toString();
            } catch (e) {
                // Ignore parse error on update
            }

            try {
                if (bot.state.automationMode === 'IMAGE') {
                    if (bot.state.autoImagePath) {
                        await sendImageFromFile(bot.state.autoImagePath, '');
                    } else {
                        console.log('Automation mode is IMAGE but no image path set, skipping.');
                    }
                } else {
                    await takeAndSendScreenshot('');
                }
            } catch (err) {
                console.error('Cron task failed:', err);
            }
        });

        console.log('Cron job successfully scheduled.');
    } catch (error: any) {
        console.error('Failed to setup cron:', error.message);
        bot.state.error = `Cron Error: ${error.message}`;
    }
};

export const takeAndSendScreenshot = async (customCaption?: string) => {
    if (!bot.client || bot.state.status !== 'READY' || !bot.state.groupId) {
        throw new Error('Bot not ready or Group ID not set');
    }

    try {
        const screenshotPath = path.join(process.cwd(), 'public', 'temp_screenshot.png');
        console.log('Capturing screenshot...');
        await screenshot({ filename: screenshotPath });

        if (!fs.existsSync(screenshotPath)) {
            throw new Error('Failed to create screenshot file');
        }

        const stats = fs.statSync(screenshotPath);
        console.log(`Screenshot captured: ${stats.size} bytes`);

        const media = MessageMedia.fromFilePath(screenshotPath);

        const groupId = bot.state.groupId.trim();
        console.log(`Sending to: ${groupId}`);

        const caption = (customCaption === undefined || customCaption === null)
            ? ''
            : customCaption;

        await bot.client.sendMessage(groupId, media, {
            caption: caption,
            sendSeen: false
        } as any);

        bot.state.lastScreenshot = new Date().toISOString();
        console.log('Screenshot sent successfully to', bot.state.groupId);
    } catch (err: any) {
        console.error('Failed to take/send screenshot', err);
        bot.state.error = `Screenshot failed: ${err.message}`;
        throw err;
    }
};

export const sendImageFromFile = async (filePath: string, caption: string = '') => {
    if (!bot.client || bot.state.status !== 'READY' || !bot.state.groupId) {
        throw new Error('Bot not ready or Group ID not set');
    }

    try {
        if (!fs.existsSync(filePath)) {
            throw new Error('File not found');
        }

        const media = MessageMedia.fromFilePath(filePath);
        const groupId = bot.state.groupId.trim();

        console.log(`Sending uploaded image to: ${groupId}`);

        await bot.client.sendMessage(groupId, media, {
            caption: caption,
            sendSeen: false
        } as any);

        bot.state.lastScreenshot = new Date().toISOString();
        console.log('Image sent successfully');
    } catch (err: any) {
        console.error('Failed to send image', err);
        throw err;
    }
};
