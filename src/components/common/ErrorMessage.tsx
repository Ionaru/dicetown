import { component$ } from "@qwik.dev/core";

export default component$<{ message: string }>(({ message }) => (
  <p class="col-span-2 text-center text-xl text-red-500">⚠️ {message}</p>
));
