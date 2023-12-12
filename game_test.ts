import { Game, Websocket } from "./game.ts";
import {
  assertArrayIncludes,
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Deserialize, Message, MsgType, Serialize } from "./message.ts";
import { delay } from "https://deno.land/std@0.208.0/async/delay.ts";
import {
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.208.0/testing/mock.ts";

class MockPlayer implements Websocket {
  send = spy();
  addEventListener = spy();

  assertMsgForPlayer(i: number, msg: Message) {
    assertSpyCall(this.send, i, { args: [Serialize(msg)] });
  }

  sendMsgToServer(msg: Message) {
    const listener = this.addEventListener.calls[0].args[1];
    listener({ data: Serialize(msg) });
  }
}

Deno.test("game", async (t) => {
  await t.step("naming", () => {
    const p1 = new MockPlayer();
    const p2 = new MockPlayer();
    const g = new Game(p1, p2);

    p1.assertMsgForPlayer(0, { type: MsgType.WINCOUNT, count: 50 });
    p1.assertMsgForPlayer(1, { type: MsgType.NAMEPLEASE });

    p2.assertMsgForPlayer(0, { type: MsgType.WINCOUNT, count: 50 });
    p2.assertMsgForPlayer(1, { type: MsgType.NAMEPLEASE });

    p1.sendMsgToServer({ type: MsgType.NAME, name: "p1" });
    p2.sendMsgToServer({ type: MsgType.NAME, name: "p2" });

    p1.assertMsgForPlayer(2, { type: MsgType.MATCHED, opponentName: "p2" });
    p2.assertMsgForPlayer(2, { type: MsgType.MATCHED, opponentName: "p1" });

    g.stop();
  });
});
