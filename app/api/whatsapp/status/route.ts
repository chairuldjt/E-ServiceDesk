import { NextResponse } from 'next/server';
import { getBotState, initBot } from '@/lib/whatsapp/bot';

export async function GET() {
    const state = getBotState();
    // Log the status for server-side debugging
    if (state.status !== 'DISCONNECTED') {
        console.log(`[Status API] Current Bot Status: ${state.status}`);
    }
    return NextResponse.json(state);
}
