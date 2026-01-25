import { component$, useContext } from "@builder.io/qwik";
import { Link, server$, type DocumentHead } from "@builder.io/qwik-city";

import Button from "../components/common/button";
import { DiceBoxContext } from "../context/dice-box";
import { rollDice } from "../server/secure-random";
import { title } from "../utils/title";

export const serverRollDice = server$(async () => {
  const [firstNumber, secondNumber] = rollDice(2, 6);
  console.log(`${firstNumber},${secondNumber}`);
  return `${firstNumber},${secondNumber}`;
});

export default component$(() => {
  const diceBox = useContext(DiceBoxContext);
  if (diceBox.value) {
    diceBox.value.onRollComplete = () => {
      console.log("HIJACKED");
    };
  }

  return (
    <div class="flex flex-col items-center justify-center h-full gap-4">
      <h1 class="text-8xl font-bold">{title}</h1>
      <p>{title} is a game about rolling dice and building towns.</p>
      <div class="flex flex-row gap-4 items-center justify-center">
        <Link href="/room/create">
          <Button>Play</Button>
        </Link>
        <Link href="/room/join">
          <Button>Join</Button>
        </Link>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
