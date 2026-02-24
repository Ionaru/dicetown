import { $, component$, useSignal } from "@qwik.dev/core";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
  type DocumentHead,
} from "@qwik.dev/router";

import { getSessionContext } from "../../auth/session";
import BigButton from "../../components/common/BigButton";
import Title from "../../components/common/MainTitle";
import StandardButton from "../../components/common/StandardButton";
import Subtitle from "../../components/common/SubTitle";
import { createRoom } from "../../server/game-service";
import { title } from "../../utils/title";

import { navigateToRoom } from "./guards";

export const usePlayerRoom = routeLoader$((requestEvent) =>
  navigateToRoom(requestEvent),
);

const createRoomAction = server$(async function () {
  const { session } = await getSessionContext(this);
  return await createRoom(session);
});

export default component$(() => {
  const nav = useNavigate();
  const isLoading = useSignal(false);
  const howToPlayDialogRef = useSignal<HTMLDialogElement>();
  const createRoom = $(async () => {
    try {
      isLoading.value = true;
      const code = await createRoomAction();
      await nav(`/room/${code}/`);
    } finally {
      isLoading.value = false;
    }
  });

  const openHowToPlayDialog = $(() => {
    howToPlayDialogRef.value?.showModal();
  });

  const closeHowToPlayDialog = $(() => {
    howToPlayDialogRef.value?.close();
  });

  return (
    <>
      <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
        <Title />
        <Subtitle text="Roll your dice, earn coins, and expand your town!" />
        <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
          <BigButton onClick$={createRoom} isLoading={isLoading.value}>
            Create Game
          </BigButton>
          <Link href="/room/join/">
            <BigButton>Join Game</BigButton>
          </Link>
          <StandardButton
            class="col-span-2"
            variant="secondary"
            onClick$={openHowToPlayDialog}
          >
            How to play
          </StandardButton>
        </div>
      </div>
      <dialog
        ref={howToPlayDialogRef}
        class="bg-mk-card-sky fixed inset-0 m-auto overflow-y-auto rounded-md border-0 p-8 shadow-md select-none backdrop:bg-black/40"
      >
        <h2 class="text-4xl">How to play</h2>
        <p class="text-xl">
          TBD
        </p>
        <StandardButton class="w-auto px-8" onClick$={closeHowToPlayDialog}>
          Close
        </StandardButton>
      </dialog>
    </>
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
