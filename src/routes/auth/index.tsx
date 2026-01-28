import { $, component$ } from "@builder.io/qwik";
import { server$ } from "@builder.io/qwik-city";
import { startRegistration } from '@simplewebauthn/browser';
import { generateRegistrationOptions } from "@simplewebauthn/server";

import Button from "../../components/common/button";

const generate = server$(async () => {
  return await generateRegistrationOptions({
    rpID: 'localhost',
    rpName: 'rpName',
    userName: 'userName',
    attestationType: 'none',
    authenticatorSelection: {
      // Defaults
      residentKey: 'preferred',
      userVerification: 'preferred',
      // Optional
      authenticatorAttachment: 'platform',
    },
  });
});

const register = $(async () => {
  const optionsJSON = await generate();
  const registration = await startRegistration({optionsJSON});
  console.log(registration);
});

export default component$(() => {
  return (
    <div>
      <h1>Auth</h1>
      <Button onClick$={register}>Sign In</Button>
    </div>
  );
});
