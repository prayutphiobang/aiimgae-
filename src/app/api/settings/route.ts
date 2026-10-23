import { getSettings, publicSettings } from "@/lib/settings";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/settings  Public site settings. */
export async function GET() {
  return handle(async () => publicSettings(await getSettings()));
}
