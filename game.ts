import { Deserialize, Message, MsgType, Serialize } from "./message.ts";

const winCount = 50;
const countDown = 5;

// Specify the parts of a Deno's Websocket which
// are actually used. This allows us to easily
// mock the Websocket during testing.
export interface Websocket {
  send(msg: string): void;
  addEventListener(
    type: string,
    listener: (event: { data: string }) => void,
  ): void;
}

// Null-object pattern for Websocket.
class NullWebsocket implements Websocket {
  send(_msg: string): void {}
  addEventListener(
    _type: string,
    _listener: (event: { data: string }) => void,
  ): void {}
}

// The game is defined as a state machine. Each state
// is modeled as a class which implements this interface.
// Each state follows RAII principles. It's constructor
// sends intial messages and sets up any timers. The
// update method handles received messages and cancels
// said timers before returning a new state.
interface State {
  stop(): void;
  update(event: [0 | 1, Message]): State;
}

class Naming implements State {
  constructor(
    private readonly game: Game,
    private readonly name: [string, string] = ["", ""],
  ) {
    this.game.broadcast({ type: MsgType.WINCOUNT, count: winCount });
    this.game.broadcast({ type: MsgType.NAMEPLEASE });
  }

  stop(): void {}

  update(event: [0 | 1, Message]): State {
    const [i, msg] = event;
    if (msg.type !== MsgType.NAME) {
      logIgnoredMsg("naming", event);
      return this;
    }

    this.name[i] = msg.name;
    if (!this.name.every((p) => p !== "")) {
      return this;
    }

    this.game.send(0, {
      type: MsgType.MATCHED,
      opponentName: this.name[1],
    });
    this.game.send(1, {
      type: MsgType.MATCHED,
      opponentName: this.name[0],
    });

    return new Counting(this.game);
  }
}

class Counting implements State {
  private readonly intervalID: number;

  constructor(
    private readonly game: Game,
    private count: number = countDown,
  ) {
    // Start the count down. When we
    // reach 0, switch to State.GAMING.
    this.intervalID = setInterval(() => {
      if (this.count > 0) {
        this.game.broadcast({
          type: MsgType.COUNTDOWN,
          value: this.count,
        });
        this.count--;
      } else {
        clearInterval(this.intervalID);
        this.game.update(new Gaming(this.game));
      }
    }, 1000);
  }

  stop(): void {
    clearInterval(this.intervalID);
  }

  update(event: [0 | 1, Message]): State {
    logIgnoredMsg("counting", event);
    return this;
  }
}

class Gaming implements State {
  private readonly intervalID: number;

  constructor(
    private readonly game: Game,
    private readonly score: [number, number] = [0, 0],
  ) {
    // Send score to each player every 300ms.
    this.intervalID = setInterval(() => {
      this.game.send(0, {
        type: MsgType.CLICKCOUNT,
        yourCount: this.score[0],
        theirCount: this.score[1],
      });
      this.game.send(1, {
        type: MsgType.CLICKCOUNT,
        yourCount: this.score[1],
        theirCount: this.score[0],
      });
    }, 300);
  }

  stop(): void {
    clearInterval(this.intervalID);
  }

  update(event: [0 | 1, Message]): State {
    const [i, msg] = event;
    if (msg.type !== MsgType.CLICK) {
      logIgnoredMsg("gaming", event);
      return this;
    }

    // Update the player's score and check if they won.
    this.score[i]++;
    if (this.score[i] < winCount) {
      return this;
    }

    // Stop sending scores and send the game over message.
    clearInterval(this.intervalID);
    this.game.send(0, { type: MsgType.GAMEOVER, won: true });
    this.game.send(1, { type: MsgType.GAMEOVER, won: false });

    return new Done(this.game);
  }
}

class Done implements State {
  constructor(private readonly game: Game) {}

  stop(): void {}

  update(event: [0 | 1, Message]): State {
    logIgnoredMsg("done", event);
    return this;
  }
}

export class Game {
  private state: State;

  private readonly players: [Websocket, Websocket] = [
    new NullWebsocket(),
    new NullWebsocket(),
  ];

  constructor(
    conn1: Websocket = new NullWebsocket(),
    conn2: Websocket = new NullWebsocket(),
    state: (game: Game) => State = (game) => new Naming(game),
  ) {
    this.players[0] = conn1;
    this.players[1] = conn2;
    conn1.addEventListener("message", this.listener(0));
    conn2.addEventListener("message", this.listener(1));
    this.state = state(this);
  }

  stop() {
    this.state.stop();
  }

  send(i: 0 | 1, msg: Message) {
    this.players[i].send(Serialize(msg));
  }

  broadcast(msg: Message) {
    for (const player of this.players) {
      player.send(Serialize(msg));
    }
  }

  private listener(i: 0 | 1) {
    return (event: { data: string }) => {
      const msg = Deserialize(event.data);
      this.update([i, msg]);
    };
  }

  update(event: [0 | 1, Message] | State) {
    if (event instanceof Array) {
      this.state = this.state.update(event);
      return;
    }
    this.state = event;
  }
}

function logIgnoredMsg(state: string, event: [0 | 1, Message]) {
  console.log(
    `ignoring message ${event[0]} ${Serialize(event[1])} during state ${state}`,
  );
}
