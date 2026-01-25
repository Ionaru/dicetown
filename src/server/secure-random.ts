import { randomInt } from "node:crypto";

export const rollDie = (sides = 6): number => randomInt(1, sides + 1);

export const rollDice = (count: number, sides = 6): number[] => {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new Error("Invalid dice count");
  }

  return Array.from({ length: count }, () => rollDie(sides));
};
