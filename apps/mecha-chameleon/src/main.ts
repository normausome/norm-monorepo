import { Game } from "./Game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const overlay = document.getElementById("ui-overlay") as HTMLElement;

const game = new Game(canvas, overlay);
game.start();
