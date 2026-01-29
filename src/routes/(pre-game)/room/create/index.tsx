import { component$ } from "@builder.io/qwik";

import Button from "../../../../components/common/button";
import { title } from "../../../../utils/title";

export default component$(() => {
  return (
    <div class="flex h-full flex-col items-center justify-center gap-4">
      <h1 class="text-8xl font-bold">{title}</h1>
      <p>{title} is a game about rolling dice and building towns.</p>
      <div class="flex flex-row items-center justify-center gap-4">
        <Button>Create Room</Button>
      </div>
    </div>
  );
});
