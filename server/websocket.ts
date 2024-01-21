import {Deserialize, MsgType, Serialize} from "./message.ts";

interface WebSocketListenerMap {
    open: () => void;
    close: () => void;
    error: () => void;
    message: (ev: { data: string }) => void;
}

// Specify the subset of the Websocket interface which are actually
// use. This allows us to easily mock the Websocket during testing.
export interface Websocket {
    addEventListener<K extends keyof WebSocketListenerMap>(
        type: K,
        listener: WebSocketListenerMap[K],
    ): void;

    send(msg: string): void;
}

// Null-object pattern for our Websocket interface.
export class NullWebsocket implements Websocket {
    private listener: (ev: { data: string }) => void = () => {
    };

    addEventListener<K extends keyof WebSocketListenerMap>(
        type: K,
        listener: WebSocketListenerMap[K],
    ): void {
        if (type == "message") {
            this.listener = (listener as WebSocketListenerMap["message"])
        }
    }

    send(data: string): void {
        const msg = Deserialize(data);
        if (msg.id === MsgType.NAMEPLEASE) {
            // Schedule a name message to be sent. We cannot call the listener
            // directly because the Game.state hasn't finished initializing at
            // this point.
            setTimeout(() => {
                this.listener({data: Serialize({id: MsgType.NAME, name: "null"})});
            });
        }
    }
}
