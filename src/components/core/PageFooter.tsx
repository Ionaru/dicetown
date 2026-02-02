import { component$ } from "@qwik.dev/core";

export default component$(() => {
  return (
    <footer class="flex items-center justify-center">
      <span>Made by Ionaru</span>
      <span class="mx-2">|</span>
      <span class="text-sm">© {new Date().getFullYear()}</span>
    </footer>
  );
});
