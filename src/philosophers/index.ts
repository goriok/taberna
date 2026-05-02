import type { PhilosopherConfig } from "@/types/philosopher";
import { heidegger } from "./heidegger";
import { nietzsche } from "./nietzsche";
import { schopenhauer } from "./schopenhauer";
import { camus } from "./camus";
import { han } from "./han";
import { kosik } from "./kosik";
import { sennett } from "./sennett";

export const philosophers: PhilosopherConfig[] = [
  heidegger,
  nietzsche,
  schopenhauer,
  camus,
  han,
  kosik,
  sennett,
].filter((p) => p.enabled !== false);

export { heidegger } from "./heidegger";
export { nietzsche } from "./nietzsche";
export { schopenhauer } from "./schopenhauer";
export { camus } from "./camus";
export { han } from "./han";
export { kosik } from "./kosik";
export { sennett } from "./sennett";
