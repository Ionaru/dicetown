import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <footer class="flex justify-center items-center">
      <span>Made with ❤️ by Ionaru</span>
      <span class="mx-2">|</span>
      <span class="font-junegull text-sm">© {new Date().getFullYear()}</span>
    </footer>
  );
});
