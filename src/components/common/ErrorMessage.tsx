import { component$ } from "@builder.io/qwik";

export default component$<{ message: string }>(({ message }) => (
  <p class="col-span-2 text-center text-xl text-red-500">⚠️ {message}</p>
));
