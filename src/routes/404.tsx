import { component$ } from "@builder.io/qwik";
import {
  type DocumentHead,
} from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
      <h1 class="text-8xl font-bold">404</h1>
      <p class="text-2xl">Page not found</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: `404`,
  meta: [
    {
      name: "description",
      content: `Page not found`,
    },
  ],
};
