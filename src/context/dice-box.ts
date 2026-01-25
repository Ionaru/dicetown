import DiceBox from "@3d-dice/dice-box-threejs";
import { createContextId, Signal } from "@builder.io/qwik";

export const DiceBoxContext =
  createContextId<Signal<DiceBox | null>>("dice-box");
