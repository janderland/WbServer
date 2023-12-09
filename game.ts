import { Deserialize, Message, Serialize, Type } from "./message.ts";

const winCount = 50;

enum State {
  NAMING,
  COUNTING,
  GAMING,
  DONE,
}

// Specify the parts of a Deno's Websocket which
// Game will actually use. This allows us to easily
// mock the Websocket during testing.
interface Websocket {
  send(msg: string): void;
  addEventListener(
    type: string,
    listener: (event: { data: string }) => void,
  ): void;
}

class Player {
  name = "";
  points = 0;
  conn: Websocket = { send: () => {}, addEventListener: () => {} };
}

export class Game {
  private state = State.NAMING;
  private readonly intervalID = { counting: 0, gaming: 0 };
  private readonly players = [new Player(), new Player()] as const;
  private count = 5;

  constructor(conn1: Websocket, conn2?: Websocket) {
    this.players[0].conn = conn1;
    conn1.addEventListener("message", this.listener(0));

    if (conn2) {
      this.players[1].conn = conn2;
      conn2.addEventListener("message", this.listener(1));
    }

    this.broadcast({ type: Type.WINCOUNT, count: winCount });
    this.broadcast({ type: Type.NAMEPLEASE });
  }

  private send(i: 0 | 1, msg: Message) {
    this.players[i].conn.send(Serialize(msg));
  }

  private broadcast(msg: Message) {
    for (const player of this.players) {
      player.conn.send(Serialize(msg));
    }
  }

  private listener(i: 0 | 1) {
    return (event: { data: string }) => {
      const msg = Deserialize(event.data);
      this.update([i, msg]);
    };
  }

  // After construction, all state changes are performed
  // by update(). The caller can either pass a tuple of
  // the player index and a Message from said player, or
  // a new State.
  private update(event: [0 | 1, Message] | State) {
    switch (this.state) {
      case State.NAMING: {
        if (typeof event !== "number") {
          // If the event is a message, we only accept Type.NAME.
          const [i, msg] = event;
          if (msg.type !== Type.NAME) {
            this.logIgnoredMsg(event);
            break;
          }
          this.players[i].name = msg.name;
          if (this.players.every((p) => p.name)) {
            this.update(State.COUNTING);
          }
          break;
        }

        // If the event is a state change, we can only change
        // state from State.NAMING to State.COUNTING.
        if (event !== State.COUNTING) {
          this.throwBadState(event);
        }

        this.state = event;

        // Send the opponent's name to each player.
        this.send(0, {
          type: Type.MATCHED,
          opponentName: this.players[1].name,
        });
        this.send(1, {
          type: Type.MATCHED,
          opponentName: this.players[0].name,
        });

        // Start the count down. When we reach 0, switch to State.GAMING.
        this.intervalID.counting = setInterval(() => {
          if (this.count > 0) {
            this.broadcast({
              type: Type.COUNTDOWN,
              value: this.count,
            });
            this.count--;
          } else {
            clearInterval(this.intervalID.counting);
            this.update(State.GAMING);
          }
        }, 1000);
        break;
      }

      case State.COUNTING: {
        // During State.COUNTING, we don't expect any messages.
        if (typeof event !== "number") {
          this.logIgnoredMsg(event);
          break;
        }

        // When the event is a state change, we can only change
        // state from State.COUNTING to State.GAMING.
        if (event !== State.GAMING) {
          this.throwBadState(event);
        }

        this.state = event;

        // Starting sending both players' scores every 300ms.
        this.intervalID.gaming = setInterval(() => {
          this.send(0, {
            type: Type.CLICKCOUNT,
            yourCount: this.players[0].points,
            theirCount: this.players[1].points,
          });
          this.send(1, {
            type: Type.CLICKCOUNT,
            yourCount: this.players[1].points,
            theirCount: this.players[0].points,
          });
        }, 300);
        break;
      }

      case State.GAMING: {
        if (typeof event !== "number") {
          // When the event is a message, we only accept Type.CLICK.
          const [i, msg] = event;
          if (msg.type !== Type.CLICK) {
            this.logIgnoredMsg(event);
            break;
          }

          // Update the player's score and check if they won.
          this.players[i].points++;
          if (this.players[i].points < winCount) {
            break;
          }
        }

        this.state = State.DONE;

        // Stop sending scores and send the game over message.
        clearInterval(this.intervalID.gaming);
        this.send(0, { type: Type.GAMEOVER, won: true });
        this.send(1, { type: Type.GAMEOVER, won: false });
        break;
      }

      case State.DONE:
        // We shouldn't perform any updates during State.DONE.
        if (typeof event !== "number") {
          this.logIgnoredMsg(event);
          break;
        }
        this.throwBadState(event);
    }
  }

  private logIgnoredMsg(event: [0 | 1, Message]) {
    console.log(
      `ignoring message ${event[0]} ${
        Serialize(event[1])
      } during state ${this.state}`,
    );
  }

  private throwBadState(state: State) {
    throw new Error(`bad state change ${State[this.state]} to ${State[state]}`);
  }
}
