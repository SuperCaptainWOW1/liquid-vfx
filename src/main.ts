import Game from "./Game";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("canvas");
if (!canvas) throw new Error("Failed to find canvas");

const dragRing = document.querySelector<HTMLElement>(".drag-ring");
if (!dragRing) throw new Error("Failed to find drag ring");

new Game(canvas, dragRing);
