import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Deserialize, Message, MsgType, Serialize } from "./message.ts";

Deno.test("round trip", async (t) => {
  const messages: Message[] = [
    { id: MsgType.WINCOUNT, count: 13 },
    { id: MsgType.NAMEPLEASE },
    { id: MsgType.NAME, name: "foo" },
    { id: MsgType.MATCHED, opponentName: "bar" },
    { id: MsgType.COUNTDOWN, value: 5 },
    { id: MsgType.CLICK },
    { id: MsgType.CLICKCOUNT, yourCount: 31, theirCount: 29 },
    { id: MsgType.GAMEOVER, won: true },
  ];

  for (const msg of messages) {
    await t.step(MsgType[msg.id], () => {
      assertEquals(Deserialize(Serialize(msg)), msg);
    });
  }
});

Deno.test("missing field", async (t) => {
  const messages = [
    { type: MsgType.WINCOUNT },
    { type: MsgType.NAME },
    { type: MsgType.MATCHED },
    { type: MsgType.COUNTDOWN },
    { type: MsgType.CLICKCOUNT, yourCount: 31 },
    { type: MsgType.CLICKCOUNT, theirCount: 29 },
    { type: MsgType.GAMEOVER },
  ];

  for (const msg of messages) {
    await t.step(MsgType[msg.type], () => {
      assertThrows(() => Deserialize(JSON.stringify(msg)));
    });
  }
});
