import { component$ } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";

import Title from "../components/common/MainTitle";
import Subtitle from "../components/common/SubTitle";

export default component$(() => {
  return (
    <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
      <Title text="404" />
      <Subtitle text="Page not found" />
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
