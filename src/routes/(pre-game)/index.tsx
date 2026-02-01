import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";

import { getSessionContext } from "../../auth/session";
import Title from "../../components/common/MainTitle";
import Button from "../../components/common/StandardButton";
import Subtitle from "../../components/common/SubTitle";
import { createRoom } from "../../server/game-service";
import { rollDice } from "../../server/secure-random";
import { title } from "../../utils/title";

import { navigateToRoom } from "./guards";

export const usePlayerRoom = routeLoader$((requestEvent) => navigateToRoom(requestEvent));

export const serverRollDice = server$(async () => {
  const [firstNumber, secondNumber] = rollDice(2, 6);
  return `${firstNumber},${secondNumber}`;
});

const createRoomAction = server$(async function () {
  const { session } = await getSessionContext(this);
  return await createRoom(session);
});

export default component$(() => {
  const nav = useNavigate();
  const isLoading = useSignal(false);
  const createRoom = $(async () => {
    try {
      isLoading.value = true;
      const code = await createRoomAction();
      await nav(`/room/${code}/`);
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
      <Title />
      <Subtitle text="Roll your dice, earn coins, and expand your town!" />
      <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
        <Button onClick$={createRoom} isLoading={isLoading.value}>
          Create Game
        </Button>
        <Link href="/room/join/">
          <Button>Join Game</Button>
        </Link>
        <Link class="col-span-2">
          <Button variant="secondary">How to play</Button>
        </Link>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: `Welcome`,
  meta: [
    {
      name: "description",
      content: `${title} is a game about rolling dice and building towns.`,
    },
  ],
};
