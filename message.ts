export enum Type {
  WINCOUNT,
  MATCHED,
  COUNTDOWN,
  CLICK,
  GAMEOVER,
  NAME,
  NAMEPLEASE,
  CLICKCOUNT,
}

export type WinCount = {
  type: Type.WINCOUNT;
  count: number;
};

export type NamePlease = {
  type: Type.NAMEPLEASE;
};

export type Name = {
  type: Type.NAME;
  name: string;
};

export type Matched = {
  type: Type.MATCHED;
  opponentName: string;
};

export type CountDown = {
  type: Type.COUNTDOWN;
  value: number;
};

export type Click = {
  type: Type.CLICK;
};

export type ClickCount = {
  type: Type.CLICKCOUNT;
  yourCount: number;
  theirCount: number;
};

export type GameOver = {
  type: Type.GAMEOVER;
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
  switch (obj.type) {
    case Type.NAMEPLEASE:
      return obj as NamePlease;

    case Type.NAME:
      if (typeof obj.name !== "string") {
        throw new Error(`name has typeof ${typeof obj.name}`);
      }
      return obj as Name;

    case Type.MATCHED:
      if (typeof obj.opponentName !== "string") {
        throw new Error(`opponentName has typeof ${typeof obj.opponentName}`);
      }
      return obj as Matched;

    case Type.COUNTDOWN:
      if (typeof obj.value !== "number") {
        throw new Error(`value has typeof ${typeof obj.value}`);
      }
      return obj as CountDown;

    case Type.CLICK:
      return obj as Click;

    case Type.CLICKCOUNT:
      if (typeof obj.yourCount !== "number") {
        throw new Error(`yourCount has typeof ${typeof obj.yourCount}`);
      }
      if (typeof obj.theirCount !== "number") {
        throw new Error(`theirCount has typeof ${typeof obj.theirCount}`);
      }
      return obj as ClickCount;

    case Type.GAMEOVER:
      if (typeof obj.won !== "boolean") {
        throw new Error(`won has typeof ${typeof obj.won}`);
      }
      return obj as GameOver;

    case Type.WINCOUNT:
      if (typeof obj.count !== "number") {
        throw new Error(`count has typeof ${typeof obj.count}`);
      }
      return obj as WinCount;

    default:
      throw new Error(`Unknown type ${obj.type}`);
  }
}
