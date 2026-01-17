declare module 'screenshot-desktop' {
    interface ScreenshotOptions {
        filename?: string;
        format?: string;
        screen?: number | string;
    }
    function screenshot(options?: ScreenshotOptions): Promise<Buffer | string>;
    export = screenshot;
}

declare module 'whatsapp-web.js' {
    export class Client {
        constructor(options: any);
        on(event: string, callback: (...args: any[]) => void): void;
        initialize(): Promise<void>;
        destroy(): Promise<void>;
        sendMessage(chatId: string, content: any, options?: any): Promise<any>;
        getChatById(chatId: string): Promise<Chat>;
    }
    export class Chat {
        id: any;
        sendMessage(content: any, options?: any): Promise<any>;
    }
    export class LocalAuth {
        constructor(options: any);
    }
    export class MessageMedia {
        static fromFilePath(path: string): MessageMedia;
        constructor(mimetype: string, data: string, filename?: string);
    }
}
