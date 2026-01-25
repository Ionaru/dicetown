import { component$ } from "@builder.io/qwik";

import Button from "../../../components/common/button";
import { title } from "../../../utils/title";

export default component$(() => {
  return (
    <div class="flex flex-col items-center justify-center h-full gap-4">
      <h1 class="text-8xl font-bold">{title}</h1>
      <p>{title} is a game about rolling dice and building towns.</p>
      <div class="flex flex-row gap-4 items-center justify-center">
        <Button>Create Room</Button>
      </div>
    </div>
  );
});
