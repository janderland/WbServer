import {MatchMaker} from "./match.ts";
import {Game} from "./game.ts";

const singlePlayer = Deno.env.get("WB_SINGLE_PLAYER") !== undefined;
let gameID = 0;

const matchMaker = new MatchMaker<WebSocket>(singlePlayer, (player1, player2) => {
    console.log("starting game");
    new Game((++gameID).toString(), player1, player2);
});

Deno.serve((req, info) => {
    if (req.headers.get("upgrade") != "websocket") {
        console.log(`rejecting connection from ${info.remoteAddr.hostname}`);
        return new Response(null, {status: 501});
    }

    const {socket, response} = Deno.upgradeWebSocket(req);
    const remote = info.remoteAddr.hostname

    socket.addEventListener("open", () => {
        matchMaker.enqueue(remote, socket);
    });

    socket.addEventListener("close", () => {
        if (matchMaker.drop(remote)) {
            console.log(`closed during match making ${remote}`);
        }
    })

    socket.addEventListener("error", () => {
        if (matchMaker.drop(remote)) {
            console.log(`errored during match making ${remote}`);
        }
    })

    console.log(`accepting connection from ${info.remoteAddr.hostname}`);
    return response;
});
