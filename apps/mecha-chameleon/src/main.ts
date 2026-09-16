import { readTimers } from "./config";
import { Game } from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const overlay = document.getElementById("ui-overlay") as HTMLElement;

new Game(canvas, overlay, readTimers(location.search)).start();
