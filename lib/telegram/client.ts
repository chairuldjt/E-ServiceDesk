import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import { NewMessage } from "telegram/events";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";

// We'll store active clients in memory to avoid re-initializing
const clients: { [userId: string]: TelegramClient } = {};

export async function getClient(userId: string, sessionString: string = "") {
    if (clients[userId]) {
        return clients[userId];
    }

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });

    clients[userId] = client;
    return client;
}

export async function startLogin(userId: string, phoneNumber: string) {
    const client = await getClient(userId);
    await client.connect();

    const { phoneCodeHash } = await client.sendCode(
        { apiId, apiHash },
        phoneNumber
    );

    return phoneCodeHash;
}

export async function finishLogin(userId: string, phoneNumber: string, phoneCodeHash: string, code: string, password?: string) {
    const client = await getClient(userId);

    try {
        await (client as any).signInUser(
            { apiId, apiHash },
            {
                phoneNumber,
                phoneCode: async () => code,
                phoneCodeHash,
                password: async () => password || "",
                onError: (err: any) => {
                    console.error("Sign in error:", err);
                    throw err;
                }
            }
        );

        const sessionString = client.session.save() as unknown as string;
        return sessionString;
    } catch (error) {
        console.error("Failed to finish login:", error);
        throw error;
    }
}

export async function automateRobtechBot(userId: string, sessionString: string, botPassword?: string) {
    const client = await getClient(userId, sessionString);
    if (!client.connected) {
        await client.connect();
    }

    const botUsername = "Robtechbot";

    try {
        // Resolve the bot entity first to avoid PEER_ID_INVALID
        const botEntity = await client.getEntity(botUsername);
        const botId = botEntity.id.toString();

        // 1. Listen for messages from the bot
        const handler = async (event: any) => {
            const message = event.message;
            if (!message || !message.peerId) return;

            // Check if message is from the bot we are automating
            const senderId = message.senderId?.toString();
            if (senderId !== botId) return;

            const text = message.message || "";
            console.log(`[Automation] Bot Message: ${text}`);

            // A. Handle Password Request
            if (text.toLowerCase().includes("password") || text.toLowerCase().includes("sandi") || text.includes("🔑")) {
                if (botPassword) {
                    console.log("[Automation] Sending password...");
                    await client.sendMessage(botEntity, { message: botPassword });
                }
            }

            // B. Handle Buttons
            if (message.replyMarkup) {
                const markup = message.replyMarkup;
                let targetButton = null;

                if (markup.rows) {
                    for (const row of markup.rows) {
                        for (const button of row.buttons) {
                            const btnText = (button as any).text || "";
                            if (btnText.includes("Login") || btnText.includes("Update") || btnText.includes("Sync")) {
                                targetButton = button;
                                break;
                            }
                        }
                    }
                }

                if (targetButton) {
                    console.log(`[Automation] Clicking button: ${(targetButton as any).text}`);
                    if (targetButton instanceof Api.KeyboardButtonCallback) {
                        try {
                            await client.invoke(new Api.messages.GetBotCallbackAnswer({
                                peer: botEntity,
                                msgId: message.id,
                                data: targetButton.data
                            }));
                        } catch (err: any) {
                            if (err.errorMessage === 'BOT_RESPONSE_TIMEOUT') {
                                console.log("[Automation] Callback timeout ignored.");
                            } else {
                                throw err;
                            }
                        }
                    } else if (targetButton instanceof Api.KeyboardButton) {
                        await client.sendMessage(botEntity, { message: targetButton.text });
                    }
                }
            }
        };

        const eventBuilder = new NewMessage({});
        client.addEventHandler(handler, eventBuilder);

        // 2. Start the sequence
        console.log("[Automation] Sending /start...");
        await client.sendMessage(botEntity, { message: "/start" });

        // Cleanup handler after 30 seconds
        setTimeout(() => {
            client.removeEventHandler(handler, eventBuilder);
            console.log("[Automation] Handler removed.");
        }, 30000);

        return true;
    } catch (error) {
        console.error("[Automation] Error resolving bot entity:", error);
        throw error;
    }
}
