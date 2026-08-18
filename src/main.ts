import Game from "./Game";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("canvas");
if (!canvas) throw new Error("Failed to find canvas");

new Game(canvas);
