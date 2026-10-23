import Stripe from "stripe";
import { getConfig } from "@/lib/serverConfig";

let client: Stripe | null = null;
let clientKey: string | null = null;

/**
 * Stripe client built from the admin-managed key (DB first, then .env).
 * Re-instantiates if the key changes at runtime.
 */
export async function getStripe(): Promise<Stripe> {
  const key = await getConfig("STRIPE_SECRET_KEY");
  if (!key || key.includes("xxx")) throw new Error("ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY (ตั้งได้ที่หน้า admin หรือใน .env)");
  if (!client || clientKey !== key) {
    client = new Stripe(key);
    clientKey = key;
  }
  return client;
}
