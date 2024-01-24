import {Deserialize, Message, MsgType, Serialize} from "./message.ts";
import {NullWebsocket, Websocket} from "./websocket.ts";

const winCount = 50;
const countDown = 5;

type PlayerID = 0 | 1;

// The game is defined as a state machine, each state being a class
// implementing this interface. These classes follow RAII principles:
// the constructor may set up intervals/timers and the stop method
// clears them. The update function handles any messages received
// during the state's lifetime.
export interface State {
    readonly id: string;

    stop(): void;

    update(event: [PlayerID, Message]): State;
}

// During the naming state, the game asks each player for their name.
// When both names are received, the game switches to the counting state.
export class Naming implements State {
    readonly id = "naming";

    constructor(
        private readonly game: Game,
        private readonly name: [string, string] = ["", ""],
    ) {
        this.game.broadcast({id: MsgType.WINCOUNT, count: winCount});
        this.game.broadcast({id: MsgType.NAMEPLEASE});
    }

    stop(): void {
    }

    update(event: [PlayerID, Message]): State {
        const [i, msg] = event;
        if (msg.id !== MsgType.NAME) {
            this.game.ignored(event);
            return this;
        }

        this.name[i] = msg.name;
        if (!this.name.every((p) => p !== "")) {
            return this;
        }

        this.game.send(0, {
            id: MsgType.MATCHED,
            opponentName: this.name[1],
        });
        this.game.send(1, {
            id: MsgType.MATCHED,
            opponentName: this.name[0],
        });

        return new Counting(this.game);
    }
}

// During the counting state, the game counts down from 5 to 0,
// after which the game switches to the gaming state.
export class Counting implements State {
    private readonly intervalID: number;
    readonly id = "counting";

    constructor(
        private readonly game: Game,
        private count: number = countDown,
    ) {
        // Start the count-down. When we
        // reach 0, switch to State.GAMING.
        this.intervalID = setInterval(() => {
            this.game.broadcast({
                id: MsgType.COUNTDOWN,
                value: this.count,
            });

            this.count--;
            if (this.count < 0) {
                clearInterval(this.intervalID);
                this.game.update(new Gaming(this.game));
            }
        }, 1000);
    }

    stop(): void {
        clearInterval(this.intervalID);
    }

    update(event: [PlayerID, Message]): State {
        this.game.ignored(event);
        return this;
    }
}

// During the gaming state, the players send click events to the
// game. Periodically, the game sends the current scores to the
// players. When one of the players reaches the win count, the
// game switches to the done state.
export class Gaming implements State {
    private readonly intervalID: number;
    readonly id = "gaming";

    constructor(
        private readonly game: Game,
        private readonly score: [number, number] = [0, 0],
    ) {
        // Send score to each player every 300ms.
        this.intervalID = setInterval(() => {
            this.game.send(0, {
                id: MsgType.CLICKCOUNT,
                yourCount: this.score[0],
                theirCount: this.score[1],
            });
            this.game.send(1, {
                id: MsgType.CLICKCOUNT,
                yourCount: this.score[1],
                theirCount: this.score[0],
            });
        }, 300);
    }

    stop(): void {
        clearInterval(this.intervalID);
    }

    update(event: [PlayerID, Message]): State {
        const [i, msg] = event;
        if (msg.id !== MsgType.CLICK) {
            this.game.ignored(event);
            return this;
        }

        // Update the player's score and check if they won.
        this.score[i]++;
        if (this.score[i] < winCount) {
            return this;
        }

        return new Done(this.game, i);
    }
}

// During the done state, the game ignores any messages received.
export class Done implements State {
    readonly id = "done";

    constructor(
        private readonly game: Game,
        winner: PlayerID,
    ) {
        const loser = winner ? 0 : 1
        this.game.send(winner, {id: MsgType.GAMEOVER, won: true});
        this.game.send(loser, {id: MsgType.GAMEOVER, won: false});
    }

    stop(): void {
    }

    update(event: [PlayerID, Message]): State {
        this.game.ignored(event);
        return this;
    }
}

export class Game {
    private _state: State;
    get state(): State {
        return this._state;
    }

    private readonly players: [Websocket, Websocket] = [
        new NullWebsocket(),
        new NullWebsocket(),
    ];

    constructor(
        readonly id: string,
        p1: Websocket = new NullWebsocket(),
        p2: Websocket = new NullWebsocket(),
        init: (game: Game) => State = (game) => new Naming(game),
    ) {
        this.players[0] = p1;
        this.players[1] = p2;

        p1.addEventListener("message", this.onMessage(0));
        p2.addEventListener("message", this.onMessage(1));

        p1.addEventListener("close", this.onClose(0))
        p2.addEventListener("close", this.onClose(1))

        p1.addEventListener("error", this.onError(0))
        p2.addEventListener("error", this.onError(1))

        // Initializing the state with this callback allows tests
        // to start a game in any state. Some states send messages
        // during their constructor, so the game must be fully
        // setup before calling the callback.
        this._state = init(this);
    }

    send(i: PlayerID, msg: Message) {
        const data = Serialize(msg);
        this.players[i].send(data);
    }

    broadcast(msg: Message) {
        for (const player of this.players) {
            player.send(Serialize(msg));
        }
    }

    update(event: [PlayerID, Message] | State) {
        if (event instanceof Array) {
            this._state = this._state.update(event);
            return;
        }

        this._state.stop()
        this._state = event;
        console.log(`game ID: ${this.id} state: ${this.state.id}`);
    }

    ignored(event: [PlayerID, Message]) {
        console.log(`game ID: ${this.id} state: ${this.state.id} ignored event: ${event}`);
    }

    private onMessage(i: PlayerID) {
        return (event: { data: string }) => {
            this.update([i, Deserialize(event.data)]);
        };
    }

    private onClose(i: PlayerID) {
        return () => {
            console.log(`game ID: ${this.id} state: ${this.state.id} closed: ${i}`)
            this.players[i] = new NullWebsocket();
            this.update(new Done(this, i ? 0 : 1))
        }
    }

    private onError(i: PlayerID) {
        return () => {
            console.log(`game ID: ${this.id} state: ${this.state.id} errored: ${i}`)
            this.players[i] = new NullWebsocket();
            this.update(new Done(this, i ? 0 : 1))
        }
    }
}
