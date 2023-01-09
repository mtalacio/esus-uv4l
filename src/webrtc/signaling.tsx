import WebSocketAsPromised from "websocket-as-promised";

class SignalingChannel {
    wsp: WebSocketAsPromised | undefined = undefined;

    constructor(url: string) {

        if(!("WebSocket" in window)) {
            alert("This browser does not support WebSockets");
            return;
        }

        this.wsp = new WebSocketAsPromised(url, {
            packMessage: data => JSON.stringify(data),
            unpackMessage: message => JSON.parse(String(message))
        });
    }

    async open() {
        await this.wsp?.open();
    }

    async send(request: any) {
        try {
            this.wsp?.sendPacked(request);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async close() {
        await this.wsp?.close();
    }

    addCloseListener(onClose: EventListener) {
        this.wsp?.onClose.addListener(event => {
            console.info(`Socket connection closed: ${event.reason}`);
            onClose(event);
        });
    }

    addErrorListener(onError: EventListener) {
        this.wsp?.onError.addListener(event => {
            console.error(event);
            onError(event);
        });
    }

    addMessageListener(onMessage: EventListener) {
        this.wsp?.onUnpackedMessage.addListener(onMessage);
    };

    static async create(url: string): Promise<SignalingChannel> {
        console.log(`Opening Signaling Channel: ${url}`);
        const signaling = new SignalingChannel(url);
        await signaling.open();
        return signaling;
    }
}

export default SignalingChannel;