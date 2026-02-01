import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import screenshot from 'screenshot-desktop';
import cron, { ScheduledTask } from 'node-cron';
import path from 'path';
import fs from 'fs';
const cronParser = require('cron-parser');

// Polyfill fetch if missing (fixes "TypeError: fetch is not a function" in node-fetch environments)
if (typeof fetch === 'undefined') {
    const nodeFetch = require('node-fetch');
    (global as any).fetch = nodeFetch;
    (global as any).Request = nodeFetch.Request;
    (global as any).Response = nodeFetch.Response;
    (global as any).Headers = nodeFetch.Headers;
}

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
        initTimeout: NodeJS.Timeout | null;
        isInitializing: boolean;
    } | undefined;
}

// Use globalThis for a robust singleton pattern in Next.js/Node.js
const bot = (function () {
    const g = globalThis as any;
    if (!g.whatsappBot) {
        g.whatsappBot = {
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
            job: null,
            initTimeout: null,
            isInitializing: false
        };
    }
    return g.whatsappBot;
})();

export const getBotState = () => bot.state;

export const initBot = async () => {
    if (bot.isInitializing) {
        console.log('Bot is already in the process of initializing...');
        return;
    }

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
    bot.isInitializing = true;

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
                    '--disable-features=VizDisplayCompositor',
                    '--disable-extensions'
                ],
                executablePath: process.env.CHROME_PATH || undefined,
            },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            // Use none to avoid library mismatches, but fix internal fetch error
            webVersionCache: {
                type: 'none'
            }
        });

        bot.client.on('loading_screen', (percent: number, message: string) => {
            console.log(`[${new Date().toISOString()}] WhatsApp Bot loading: ${percent}% - ${message}`);
            bot.state.status = 'LOADING';
            bot.state.error = `Loading: ${percent}% - ${message}`;
        });

        bot.client.on('qr', async (qr: string) => {
            console.log(`[${new Date().toISOString()}] WhatsApp Bot QR Code generated`);
            bot.state.status = 'QR_CODE';
            bot.state.error = null;
            try {
                bot.state.qrCode = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('Failed to generate QR code data URL', err);
            }
        });

        bot.client.on('ready', () => {
            bot.state.status = 'READY';
            bot.state.qrCode = null;
            if (bot.initTimeout) {
                clearTimeout(bot.initTimeout);
                bot.initTimeout = null;
            }
            bot.isInitializing = false;
            console.log('WhatsApp Bot is ready!');
            setupCron();
        });

        bot.client.on('authenticated', () => {
            if (bot.state.status !== 'LOADING') {
                bot.state.status = 'LOADING';
                console.log(`[${new Date().toISOString()}] WhatsApp Bot authenticated, waiting for ready...`);
            }
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

        // Timeout watchdog: If not ready or QR within 10 minutes, force reset
        if (bot.initTimeout) clearTimeout(bot.initTimeout);
        bot.initTimeout = setTimeout(() => {
            if (bot.client && (bot.state.status === 'CONNECTING' || bot.state.status === 'LOADING' || bot.state.status === 'QR_CODE')) {
                console.warn(`[${new Date().toISOString()}] Bot initialization timed out after 10 minutes (Status: ${bot.state.status}), forcing reset...`);
                stopBot(); // This destroys the client
                bot.state.status = 'DISCONNECTED';
                bot.state.error = 'Initialization timed out after 10 minutes. Please try again.';
            }
            bot.initTimeout = null;
            bot.isInitializing = false;
        }, 600000);

        await bot.client.initialize();

    } catch (err: any) {
        bot.state.status = 'DISCONNECTED';
        bot.state.error = err.message;
        console.error('WhatsApp Bot initialization error', err);
        bot.client = null;
        bot.isInitializing = false;
        if (bot.initTimeout) {
            clearTimeout(bot.initTimeout);
            bot.initTimeout = null;
        }
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
    bot.isInitializing = false;
    if (bot.initTimeout) {
        clearTimeout(bot.initTimeout);
        bot.initTimeout = null;
    }

    if (bot.client) {
        try {
            await bot.client.destroy();
        } catch (e) {
            console.error('Error destroying client:', e);
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
