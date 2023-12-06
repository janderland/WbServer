import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Deserialize, Message, Serialize, Type } from "./message.ts";

Deno.test("round trip", async (t) => {
  const messages: Message[] = [
    { type: Type.WINCOUNT, count: 13 },
    { type: Type.NAMEPLEASE },
    { type: Type.NAME, name: "foo" },
    { type: Type.MATCHED, opponentName: "bar" },
    { type: Type.COUNTDOWN, value: 5 },
    { type: Type.CLICK },
    { type: Type.CLICKCOUNT, yourCount: 31, theirCount: 29 },
    { type: Type.GAMEOVER, won: true },
  ];

  for (const msg of messages) {
    await t.step(Type[msg.type], () => {
      assertEquals(Deserialize(Serialize(msg)), msg);
    });
  }
});

Deno.test("missing field", async (t) => {
  const messages = [
    { type: Type.WINCOUNT },
    { type: Type.NAME },
    { type: Type.MATCHED },
    { type: Type.COUNTDOWN },
    { type: Type.CLICKCOUNT, yourCount: 31 },
    { type: Type.CLICKCOUNT, theirCount: 29 },
    { type: Type.GAMEOVER },
  ];

  for (const msg of messages) {
    await t.step(Type[msg.type], () => {
      assertThrows(() => Deserialize(JSON.stringify(msg)));
    });
  }
});
