import { requireAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";
import { handle, readJson, HttpError } from "@/lib/api";
import { publicBaseUrl } from "@/lib/publicUrl";
import { keyCount, keyStatuses } from "@/lib/mojenKeys";
import { configView, setConfigs, CONFIG_KEYS, type ConfigKey } from "@/lib/serverConfig";

export const dynamic = "force-dynamic";

/** GET /api/admin/settings  All settings + integration status (no secrets). */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const configured = (v?: string) => !!v && !/xxx|your-|change-this/i.test(v);
    return {
      settings: await getSettings(),
      integrations: {
        mojen: (await keyCount()) > 0,
        mojen_keys: await keyCount(),
        mojen_key_status: await keyStatuses(),
        stripe: configured(process.env.STRIPE_SECRET_KEY),
        stripe_webhook: configured(process.env.STRIPE_WEBHOOK_SECRET),
        google: configured(process.env.GOOGLE_CLIENT_ID) && configured(process.env.GOOGLE_CLIENT_SECRET),
        auth_secret: configured(process.env.AUTH_SECRET),
        public_url: await publicBaseUrl(),
      },
      config: await configView(),
    };
  });
}

/** PATCH /api/admin/settings  — general settings and/or server config overrides. */
export async function PATCH(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await readJson(req);

    // Server config (Stripe/Google/URLs/etc.) — only known keys are accepted.
    if (body.config && typeof body.config === "object") {
      const patch: Partial<Record<ConfigKey, string>> = {};
      for (const k of CONFIG_KEYS) {
        if (k in body.config) patch[k] = String(body.config[k] ?? "");
      }
      await setConfigs(patch);
      return { config: await configView() };
    }

    if (body.thb_per_credit !== undefined && !(Number(body.thb_per_credit) > 0))
      throw new HttpError("อัตราบาทต่อ credit ต้องมากกว่า 0");
    try {
      await updateSettings(body);
    } catch (e: any) {
      throw new HttpError(e.message);
    }
    return { settings: await getSettings() };
  });
}
