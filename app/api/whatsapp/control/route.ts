import { NextResponse } from 'next/server';
import { initBot, stopBot, logoutBot, updateConfig, takeAndSendScreenshot, getBotState, deleteAutoImage } from '@/lib/whatsapp/bot';
import path from 'path';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { action, groupId, schedule, caption } = payload;

        switch (action) {
            case 'START':
                initBot();
                break;
            case 'STOP':
                await stopBot();
                break;
            case 'UPDATE_CONFIG':
                if (groupId && schedule) {
                    updateConfig(groupId, schedule, payload.mode, payload.imagePath);
                }
                break;
            case 'SEND_MANUAL':
                await takeAndSendScreenshot(caption);
                break;
            case 'CLEAR_SESSION':
                await logoutBot();
                const authDir = path.join(process.cwd(), '.wwebjs_auth');
                if (require('fs').existsSync(authDir)) {
                    require('fs').rmSync(authDir, { recursive: true, force: true });
                }
                break;
            case 'DELETE_AUTO_IMAGE':
                deleteAutoImage();
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(getBotState());
    } catch (error: any) {
        console.error('WhatsApp Control Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
