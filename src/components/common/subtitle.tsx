import { component$ } from "@builder.io/qwik";

export default component$<{ text: string }>(({ text }) => (
  <p class="text-xl">{text}</p>
));
