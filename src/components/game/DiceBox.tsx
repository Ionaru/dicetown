import { component$ } from "@qwik.dev/core";

export default component$(() => {
  return (
    <div
      id="dice-box"
      class="pointer-events-none fixed top-0 left-0 h-full w-full"
    ></div>
  );
});
