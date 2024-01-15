import {Deserialize, MsgType, Serialize} from "./message.ts";

// Specify the parts of a Deno's Websocket which are actually used.
// This allows us to easily mock the Websocket during testing.
export interface Websocket {
    send(msg: string): void;

    addEventListener(
        type: string,
        listener: (event: { data: string }) => void,
    ): void;
}

// Null-object pattern for our Websocket interface.
export class NullWebsocket implements Websocket {
    private listener: (event: { data: string }) => void = () => {
    };

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

    addEventListener(
        _type: string,
        listener: (event: { data: string }) => void,
    ): void {
        this.listener = listener;
    }
}
