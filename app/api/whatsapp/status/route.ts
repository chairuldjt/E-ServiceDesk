import { NextResponse } from 'next/server';
import { getBotState, initBot } from '@/lib/whatsapp/bot';

export async function GET() {
    // Automatically try to initialize if it's the first visit and we want it to run
    // though usually we want the user to click "Start"
    const state = getBotState();
    return NextResponse.json(state);
}
