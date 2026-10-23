import { getPool, type RowDataPacket } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSettings } from "@/lib/settings";
import { getConfig } from "@/lib/serverConfig";
import { handle, readJson, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PackageRow extends RowDataPacket {
  id: number;
  name: string;
  price_thb: number;
  credits: number;
  bonus_credits: number;
  badge: string | null;
}

/** GET /api/billing/checkout  Active top-up packages. */
export async function GET() {
  return handle(async () => {
    const [rows] = await getPool().query<PackageRow[]>(
      `SELECT id, name, price_thb, credits, bonus_credits, badge
         FROM packages WHERE active = 1 ORDER BY sort_order ASC, price_thb ASC`
    );
    const s = await getSettings();
    const pk = await getConfig("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    return {
      packages: rows,
      thb_per_credit: s.thb_per_credit,
      min_topup_thb: s.min_topup_thb,
      publishableKey: pk && !pk.includes("xxx") ? pk : "",
    };
  });
}

/**
 * POST /api/billing/checkout  { packageId } | { amountThb }
 * Creates a Stripe Checkout session and a pending payment row.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(req);
    const settings = await getSettings();
    const pool = getPool();

    let amountThb: number;
    let credits: number;
    let packageId: number | null = null;
    let label: string;

    if (body.packageId) {
      const [rows] = await pool.query<PackageRow[]>(
        "SELECT id, name, price_thb, credits, bonus_credits FROM packages WHERE id = ? AND active = 1 LIMIT 1",
        [Number(body.packageId)]
      );
      const pkg = rows[0];
      if (!pkg) throw new HttpError("ไม่พบแพ็กเกจ", 404);
      amountThb = pkg.price_thb;
      credits = pkg.credits + pkg.bonus_credits;
      packageId = pkg.id;
      label = `แพ็กเกจ ${pkg.name} (${credits} credit)`;
    } else {
      amountThb = Math.floor(Number(body.amountThb));
      if (!Number.isInteger(amountThb) || amountThb < settings.min_topup_thb)
        throw new HttpError(`ยอดขั้นต่ำ ${settings.min_topup_thb} บาท`);
      if (amountThb > 100000) throw new HttpError("ยอดสูงสุด 100,000 บาทต่อครั้ง");
      credits = Math.floor(amountThb / settings.thb_per_credit);
      label = `เติม ${credits} credit`;
    }
    if (credits < 1) throw new HttpError("ยอดนี้ได้ credit ไม่ถึง 1");

    // Return to the same origin the user is browsing, otherwise the session
    // cookie is not sent back and they appear logged out after paying.
    const origin = new URL(req.url).origin;
    const common = {
      mode: "payment" as const,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "thb",
            unit_amount: amountThb * 100,
            product_data: { name: label },
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: String(user.id), credits: String(credits) },
    };

    // Embedded = pay inside our own page; hosted = Stripe's page (fallback).
    const embedded = body.mode !== "hosted";
    const stripe = await getStripe();
    const session = embedded
      ? await stripe.checkout.sessions.create({
          ...common,
          ui_mode: "embedded",
          return_url: `${origin}/wallet?session_id={CHECKOUT_SESSION_ID}`,
        })
      : await stripe.checkout.sessions.create({
          ...common,
          success_url: `${origin}/wallet?status=success`,
          cancel_url: `${origin}/wallet?status=cancel`,
        });

    await pool.execute(
      `INSERT INTO payments (user_id, package_id, stripe_session_id, amount_thb, credit_added, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [user.id, packageId, session.id, amountThb, credits]
    );
    return { url: session.url, clientSecret: session.client_secret, sessionId: session.id };
  });
}
