import { component$ } from "@builder.io/qwik";

export default component$<{ title: string }>(({ title }) => (
  <h1 class="text-4xl font-bold capitalize">{title}</h1>
));
