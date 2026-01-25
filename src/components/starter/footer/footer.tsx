import { component$ } from "@builder.io/qwik";

import { useDBTest, useServerTimeLoader } from "../../../routes/layout";

export default component$(() => {
  const serverTime = useServerTimeLoader();
  const { data } = useDBTest().value;
  console.log("data", data);

  return (
    <footer class="flex justify-center items-center">
      <span>Made with ♡ by Ionaru</span>
      <span class="mx-2">|</span>
      <span class="font-junegull">{serverTime.value.date}</span>
    </footer>
  );
});
