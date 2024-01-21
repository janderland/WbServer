export class MatchMaker<T> {
    private player: T | undefined;
    private id = "";

    constructor(
        private readonly singlePlayer: boolean,
        private readonly startGame: (item1: T, item2?: T) => void,
    ) {
    }

    enqueue(id: string, newPlayer: T) {
        if (this.singlePlayer) {
            this.startGame(newPlayer);
            return;
        }

        if (this.player == undefined) {
            this.player = newPlayer
            this.id = id
            return;
        }

        const player = this.player
        this.player = undefined
        this.id = ""

        this.startGame(player, newPlayer)
    }

    drop(id: string): boolean {
        if (this.id != id) {
            return false;
        }
        this.player = undefined
        this.id = ""
        return true;
    }
}
