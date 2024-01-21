export enum MsgType {
    MATCHED,
    COUNTDOWN,
    CLICK,
    GAMEOVER,
    NAME,
    NAMEPLEASE,
    CLICKCOUNT,
    WINCOUNT,
}

export type WinCount = {
    id: MsgType.WINCOUNT;
    count: number;
};

export type NamePlease = {
    id: MsgType.NAMEPLEASE;
};

export type Name = {
    id: MsgType.NAME;
    name: string;
};

export type Matched = {
    id: MsgType.MATCHED;
    opponentName: string;
};

export type CountDown = {
    id: MsgType.COUNTDOWN;
    value: number;
};

export type Click = {
    id: MsgType.CLICK;
};

export type ClickCount = {
    id: MsgType.CLICKCOUNT;
    yourCount: number;
    theirCount: number;
};

export type GameOver = {
    id: MsgType.GAMEOVER;
    won: boolean;
};

export type Message =
    | WinCount
    | NamePlease
    | Name
    | Matched
    | CountDown
    | Click
    | ClickCount
    | GameOver;

export function Serialize(msg: Message): string {
    return JSON.stringify(msg);
}

export function Deserialize(json: string): Message {
    const obj = JSON.parse(json);
    switch (obj.id) {
        case MsgType.NAMEPLEASE:
            return obj as NamePlease;

        case MsgType.NAME:
            if (typeof obj.name !== "string") {
                throw new Error(`name has typeof ${typeof obj.name}`);
            }
            return obj as Name;

        case MsgType.MATCHED:
            if (typeof obj.opponentName !== "string") {
                throw new Error(`opponentName has typeof ${typeof obj.opponentName}`);
            }
            return obj as Matched;

        case MsgType.COUNTDOWN:
            if (typeof obj.value !== "number") {
                throw new Error(`value has typeof ${typeof obj.value}`);
            }
            return obj as CountDown;

        case MsgType.CLICK:
            return obj as Click;

        case MsgType.CLICKCOUNT:
            if (typeof obj.yourCount !== "number") {
                throw new Error(`yourCount has typeof ${typeof obj.yourCount}`);
            }
            if (typeof obj.theirCount !== "number") {
                throw new Error(`theirCount has typeof ${typeof obj.theirCount}`);
            }
            return obj as ClickCount;

        case MsgType.GAMEOVER:
            if (typeof obj.won !== "boolean") {
                throw new Error(`won has typeof ${typeof obj.won}`);
            }
            return obj as GameOver;

        case MsgType.WINCOUNT:
            if (typeof obj.count !== "number") {
                throw new Error(`count has typeof ${typeof obj.count}`);
            }
            return obj as WinCount;

        default:
            throw new Error(`Unknown type ${obj.id}`);
    }
}
