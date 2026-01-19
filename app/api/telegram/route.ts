import { NextRequest, NextResponse } from "next/server";
import { startLogin, finishLogin, automateRobtechBot, getClient } from "@/lib/telegram/client";
import pool from "@/lib/db";
import { verify } from "jsonwebtoken";
import { Api } from "telegram";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";

async function getUserIdFromRequest(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    try {
        const decoded = verify(token, JWT_SECRET) as any;
        return decoded.id;
    } catch (e) {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        const [rows]: any = await pool.query("SELECT telegram_session FROM users WHERE id = ?", [userId]);
        const session = rows[0]?.telegram_session;

        if (!session) {
            return NextResponse.json({ status: "DISCONNECTED" });
        }

        const client = await getClient(userId.toString(), session);
        if (!client.connected) {
            await client.connect();
        }

        if (action === 'messages') {
            const botEntity = await client.getEntity("Robtechbot");
            const history = await client.getMessages(botEntity, { limit: 100 });

            // Find the most recent ReplyKeyboardMarkup to show as the bottom keyboard
            let mainKeyboard = null;
            for (const m of history) {
                const markup = m.replyMarkup as any;
                if (markup) {
                    if (m.replyMarkup instanceof Api.ReplyKeyboardMarkup || markup.className === 'ReplyKeyboardMarkup') {
                        mainKeyboard = markup.rows.map((r: any) =>
                            r.buttons.map((b: any) => ({ text: b.text }))
                        );
                        break;
                    }
                }
            }

            const messages = history.slice(0, 50).map((m: any) => {
                const markup = m.replyMarkup as any;
                const isInline = m.replyMarkup instanceof Api.ReplyInlineMarkup || markup?.className === 'ReplyInlineMarkup';
                const isPhoto = !!m.media && (m.media instanceof Api.MessageMediaPhoto || m.media.className === 'MessageMediaPhoto');

                return {
                    text: m.message,
                    out: m.out,
                    id: m.id,
                    isInline: isInline,
                    isPhoto: isPhoto,
                    buttons: (m.replyMarkup as any)?.rows?.flatMap((r: any, rowIndex: number) =>
                        r.buttons.map((b: any, colIndex: number) => ({
                            text: b.text,
                            row: rowIndex,
                            col: colIndex,
                            type: b instanceof Api.KeyboardButtonCallback ? 'callback' : 'text'
                        }))
                    )
                };
            });
            return NextResponse.json({ messages, mainKeyboard });
        }

        const me = await client.getMe();
        return NextResponse.json({
            status: "CONNECTED",
            user: {
                id: me.id.toString(),
                username: me.username,
                firstName: me.firstName
            }
        });
    } catch (error: any) {
        console.error("GET Error:", error);
        return NextResponse.json({ status: "DISCONNECTED", error: error.message });
    }
}

export async function POST(request: NextRequest) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, phoneNumber, phoneCodeHash, code, password, message, msgId, row, col, photo } = await request.json();

    try {
        const [rows]: any = await pool.query("SELECT telegram_session FROM users WHERE id = ?", [userId]);
        const savedSession = rows[0]?.telegram_session;

        switch (action) {
            case "connect":
                if (!phoneNumber) throw new Error("Phone number required");
                const hash = await startLogin(userId.toString(), phoneNumber);
                return NextResponse.json({ phoneCodeHash: hash });

            case "verify":
                if (!phoneNumber || !phoneCodeHash || !code) throw new Error("Missing verification details");
                const sessionString = await finishLogin(userId.toString(), phoneNumber, phoneCodeHash, code, password);
                await pool.query("UPDATE users SET telegram_session = ? WHERE id = ?", [sessionString, userId]);
                return NextResponse.json({ success: true });

            case "send":
                if (!savedSession || !message) throw new Error("Not logged in or empty message");
                const client = await getClient(userId.toString(), savedSession);
                if (!client.connected) await client.connect();
                const botEntity = await client.getEntity("Robtechbot");
                await client.sendMessage(botEntity, { message });
                return NextResponse.json({ success: true });

            case "send-photo":
                if (!savedSession || !photo) throw new Error("Missing session or photo");
                const photoClient = await getClient(userId.toString(), savedSession);
                if (!photoClient.connected) await photoClient.connect();

                const photoBotEntity = await photoClient.getEntity("Robtechbot");

                // Convert base64 to Buffer if needed
                let fileBuffer: any = photo;
                if (typeof photo === 'string' && photo.startsWith('data:image')) {
                    const base64Data = photo.split(',')[1];
                    fileBuffer = Buffer.from(base64Data, 'base64');
                    // Add a filename hint to the buffer to help Telegram's MIME type detection
                    (fileBuffer as any).name = "photo.jpg";
                }

                await photoClient.sendFile(photoBotEntity, {
                    file: fileBuffer,
                    caption: message || "",
                    parseMode: "html",
                    forceDocument: false,
                    workers: 1
                });
                return NextResponse.json({ success: true });

            case "click":
                if (!savedSession || !msgId) throw new Error("Missing details for click");
                const clickClient = await getClient(userId.toString(), savedSession);
                if (!clickClient.connected) await clickClient.connect();

                const clickBotEntity = await clickClient.getEntity("Robtechbot");
                const history = await clickClient.getMessages(clickBotEntity, { ids: [msgId] });
                const msg = history[0];
                if (msg && msg.replyMarkup) {
                    const button = (msg.replyMarkup as any).rows[row].buttons[col];
                    if (button instanceof Api.KeyboardButtonCallback) {
                        try {
                            await clickClient.invoke(new Api.messages.GetBotCallbackAnswer({
                                peer: clickBotEntity,
                                msgId: msg.id,
                                data: button.data
                            }));
                        } catch (err: any) {
                            if (err.errorMessage === 'BOT_RESPONSE_TIMEOUT') {
                                console.log("[Telegram] Callback timeout ignored, bot might still process it.");
                            } else {
                                throw err;
                            }
                        }
                    } else {
                        await clickClient.sendMessage(clickBotEntity, { message: button.text });
                    }
                }
                return NextResponse.json({ success: true });

            case "automate":
                if (!savedSession) throw new Error("Not logged in to Telegram");
                await automateRobtechBot(userId.toString(), savedSession);
                return NextResponse.json({ success: true });

            case "disconnect":
                await pool.query("UPDATE users SET telegram_session = NULL WHERE id = ?", [userId]);
                return NextResponse.json({ success: true });

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
