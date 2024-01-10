import { Queue } from "./queue.ts";
import { Game } from "./game.ts";

const singlePlayer = Deno.env.get("WB_SINGLE_PLAYER") !== undefined;
let gameID = 0;

const queue = new Queue<WebSocket>(singlePlayer, (player1, player2) => {
  console.log("starting game");
  new Game((++gameID).toString(), player1, player2);
});

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    console.log("rejecting connection");
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  // TODO: If the websocket disconnects before the game
  // starts, we need to remove it from the queue.
  socket.addEventListener("open", () => {
    queue.enqueue(socket);
  });

  console.log("accepting connection");
  return response;
});
