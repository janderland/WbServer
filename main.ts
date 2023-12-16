import { Queue } from "./queue.ts";
import { Game } from "./game.ts";

const queue = new Queue<WebSocket>(true, (player1, player2) => {
  console.log("starting game");
  new Game(player1, player2);
});

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    console.log("rejecting connection");
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    queue.enqueue(socket);
  });

  console.log("accepting connection");
  return response;
});
