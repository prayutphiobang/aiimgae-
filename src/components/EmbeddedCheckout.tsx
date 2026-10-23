"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout as StripeEmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

const promises = new Map<string, Promise<Stripe | null>>();

/** Load Stripe.js once per publishable key. Key comes from the server (DB/env). */
function getStripeJs(key: string) {
  if (!promises.has(key)) {
    promises.set(key, key ? loadStripe(key) : Promise.resolve(null));
  }
  return promises.get(key)!;
}

/** Stripe's payment form rendered inside our own page (no redirect). */
export default function EmbeddedCheckout({
  clientSecret,
  publishableKey,
}: {
  clientSecret: string;
  publishableKey: string;
}) {
  return (
    <EmbeddedCheckoutProvider stripe={getStripeJs(publishableKey)} options={{ clientSecret }}>
      <StripeEmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
