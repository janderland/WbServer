import { Deserialize, Message, Serialize, Type } from "./message.ts";

const winCount = 50;

enum State {
  NAMING,
  COUNTING,
  GAMING,
  DONE,
}

interface Conn {
  send(msg: string): void;
  addEventListener(
    type: string,
    listener: (event: { data: string }) => void,
  ): void;
}

class Player {
  name = "";
  points = 0;
  conn: Conn = { send: () => {}, addEventListener: () => {} };
}

export class Game {
  private state = State.NAMING;
  private readonly intervalID = { counting: 0, gaming: 0 };
  private readonly players = [new Player(), new Player()] as const;
  private count = 5;

  constructor(conn1: Conn, conn2?: Conn) {
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

      switch (this.state) {
        // During the naming state, the players submit
        // their display names to the server.
        case State.NAMING:
          switch (msg.type) {
            case Type.NAME:
              this.players[i].name = msg.name;
              if (this.players.every((p) => p.name)) {
                this.toStateCounting();
              }
              break;

            default:
              this.logIgnoredMsg(msg);
          }
          break;

        // During the counting state, the server sends
        // a count down message once a second. No messages
        // are expected from the client.
        case State.COUNTING:
          switch (msg.type) {
            default:
              this.logIgnoredMsg(msg);
          }
          break;

        // During the gaming state, the players send
        // messages to the server. The first player to
        // reach the win count wins the game.
        case State.GAMING:
          switch (msg.type) {
            case Type.CLICK:
              this.players[i].points++;
              if (this.players[i].points >= winCount) {
                this.toStateDone(i);
              }
              break;

            default:
              this.logIgnoredMsg(msg);
          }
          break;

        // During the done state all messages
        // are ignored.
        case State.DONE:
          switch (msg.type) {
            default:
              this.logIgnoredMsg(msg);
          }
          break;
      }
    };
  }

  private toStateCounting() {
    this.state = State.COUNTING;

    this.send(0, { type: Type.MATCHED, opponentName: this.players[1].name });
    this.send(1, { type: Type.MATCHED, opponentName: this.players[0].name });

    this.intervalID.counting = setInterval(() => {
      if (this.count > 0) {
        this.broadcast({
          type: Type.COUNTDOWN,
          value: this.count,
        });
        this.count--;
      } else {
        clearInterval(this.intervalID.counting);
        this.toStateGaming();
      }
    }, 1000);
  }

  private toStateGaming() {
    this.state = State.GAMING;

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
  }

  private toStateDone(i: 0 | 1) {
    this.state = State.DONE;

    clearInterval(this.intervalID.gaming);
    this.send(i, { type: Type.GAMEOVER, won: true });
    this.send(i ? 0 : 1, { type: Type.GAMEOVER, won: false });
  }

  private logIgnoredMsg(msg: Message) {
    console.log(`ignoring message ${msg} during state ${this.state}`);
  }
}
