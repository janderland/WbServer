import { Queue } from "./queue.ts";
import { Game } from "./game.ts";

const queue = new Queue<WebSocket>(false, (player1, player2) => {
  new Game(player1, player2);
});

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    queue.enqueue(socket);
  });

  return response;
});
