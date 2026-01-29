import { component$ } from "@builder.io/qwik";

import { title } from "../../utils/title";

export default component$<{ text?: string }>(({ text = title }) => (
  <h1 class="text-8xl font-bold">{text}</h1>
));
