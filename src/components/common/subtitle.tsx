import { component$ } from "@qwik.dev/core";

export default component$<{ text: string }>(({ text }) => (
  <p class="text-xl">{text}</p>
));
