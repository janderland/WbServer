import {Counting, Done, Game, Gaming, Naming, State,} from "./game.ts";
import {Websocket} from './websocket.ts';
import {Message, MsgType, Serialize} from "./message.ts";
import {assertSpyCall, spy,} from "https://deno.land/std@0.208.0/testing/mock.ts";
import {FakeTime} from "https://deno.land/std@0.184.0/testing/time.ts";
import {assertInstanceOf} from "https://deno.land/std@0.208.0/assert/mod.ts";

class TestPlayer implements Websocket {
    send = spy();
    addEventListener = spy();

    assertMsgForPlayer(i: number, msg: Message) {
        assertSpyCall(this.send, i, {args: [Serialize(msg)]});
    }

    sendMsgToServer(msg: Message) {
        const listener = this.addEventListener.calls[0].args[1];
        listener({data: Serialize(msg)});
    }

    sendCloseToServer() {
        this.addEventListener.calls[1].args[1]()
    }
}

// Initializes the game with spying players, runs the
// given test and ensures the game stops before exiting.
function env(
    init: (g: Game) => State,
    fn: (tm: FakeTime, g: Game, p1: TestPlayer, p2: TestPlayer) => void,
) {
    const tm = new FakeTime();
    const p1 = new TestPlayer();
    const p2 = new TestPlayer();
    const g = new Game("test", p1, p2, init);

    try {
        fn(tm, g, p1, p2);
    } finally {
        g.state.stop();
    }
}

Deno.test("game", async (t) => {
    await t.step("naming", () => {
        env((g: Game) => new Naming(g), (_tm, g, p1, p2) => {
            p1.assertMsgForPlayer(0, {id: MsgType.WINCOUNT, count: 50});
            p1.assertMsgForPlayer(1, {id: MsgType.NAMEPLEASE});

            p2.assertMsgForPlayer(0, {id: MsgType.WINCOUNT, count: 50});
            p2.assertMsgForPlayer(1, {id: MsgType.NAMEPLEASE});

            p1.sendMsgToServer({id: MsgType.NAME, name: "p1"});
            p2.sendMsgToServer({id: MsgType.NAME, name: "p2"});

            p1.assertMsgForPlayer(2, {id: MsgType.MATCHED, opponentName: "p2"});
            p2.assertMsgForPlayer(2, {id: MsgType.MATCHED, opponentName: "p1"});

            assertInstanceOf(g.state, Counting);
        });
    });

    await t.step("counting", () => {
        env((g: Game) => new Counting(g), (tm, g, p1, p2) => {
            for (let i = 0; i <= 5; i++) {
                tm.tick(1000);
                p1.assertMsgForPlayer(i, {id: MsgType.COUNTDOWN, value: 5 - i});
                p2.assertMsgForPlayer(i, {id: MsgType.COUNTDOWN, value: 5 - i});
            }

            assertInstanceOf(g.state, Gaming);
        });
    });

    await t.step("gaming", () => {
        env((g: Game) => new Gaming(g), (tm, g, p1, p2) => {
            tm.tick(300);
            p1.assertMsgForPlayer(0, {
                id: MsgType.CLICKCOUNT,
                yourCount: 0,
                theirCount: 0,
            });
            p2.assertMsgForPlayer(0, {
                id: MsgType.CLICKCOUNT,
                yourCount: 0,
                theirCount: 0,
            });

            p1.sendMsgToServer({id: MsgType.CLICK});
            tm.tick(300);
            p1.assertMsgForPlayer(1, {
                id: MsgType.CLICKCOUNT,
                yourCount: 1,
                theirCount: 0,
            });
            p2.assertMsgForPlayer(1, {
                id: MsgType.CLICKCOUNT,
                yourCount: 0,
                theirCount: 1,
            });

            p2.sendMsgToServer({id: MsgType.CLICK});
            tm.tick(300);
            p1.assertMsgForPlayer(2, {
                id: MsgType.CLICKCOUNT,
                yourCount: 1,
                theirCount: 1,
            });
            p2.assertMsgForPlayer(2, {
                id: MsgType.CLICKCOUNT,
                yourCount: 1,
                theirCount: 1,
            });

            for (let i = 0; i < 49; i++) {
                p2.sendMsgToServer({id: MsgType.CLICK});
            }
            p1.assertMsgForPlayer(3, {
                id: MsgType.GAMEOVER,
                won: false,
            });
            p2.assertMsgForPlayer(3, {
                id: MsgType.GAMEOVER,
                won: true,
            });

            assertInstanceOf(g.state, Done);
        });
    });

    await t.step("close", async (t) => {
        const tests: { name: string; init: (g: Game) => State }[] = [
            {name: "naming", init: (g: Game) => new Naming(g)},
            {name: "counting", init: (g: Game) => new Counting(g)},
            {name: "gaming", init: (g: Game) => new Gaming(g)}
        ];

        for (let i = 0; i < tests.length; i++) {
            const test = tests[i]

            await t.step(`p1 while ${test.name}`, () => {
                env(test.init, (_tm, g, p1, _p2) => {
                    p1.sendCloseToServer()
                    assertInstanceOf(g.state, Done);
                });
            });

            await t.step(`p2 while ${test.name}`, () => {
                env(test.init, (_tm, g, _p1, p2) => {
                    p2.sendCloseToServer()
                    assertInstanceOf(g.state, Done);
                });
            });
        }
    });
});
