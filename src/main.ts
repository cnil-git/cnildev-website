import "./styles.css";
import { startAmbient } from "./ambient";
import { startShell } from "./shell";

const setAmbient = startAmbient(document.getElementById("ambient") as HTMLCanvasElement);
startShell(setAmbient);
