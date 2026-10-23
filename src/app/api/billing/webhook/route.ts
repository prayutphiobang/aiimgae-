import { NextResponse } from "next/server";
import { getPool, type RowDataPacket } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getConfig } from "@/lib/serverConfig";
import { adjustCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PaymentRow extends RowDataPacket {
  id: number;
  user_id: number;
  credit_added: number;
}

/** POST /api/billing/webhook  Stripe → credit the user once per paid session. */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = await getConfig("STRIPE_WEBHOOK_SECRET");
  if (!sig || !whSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(await req.text(), sig, whSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const pool = getPool();
  const session = event.data.object as any;

  if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
    const [rows] = await pool.query<PaymentRow[]>(
      "SELECT id, user_id, credit_added FROM payments WHERE stripe_session_id = ? LIMIT 1",
      [session.id]
    );
    const payment = rows[0];
    if (payment) {
      // Conditional update = idempotent even if Stripe retries concurrently.
      const [upd] = (await pool.execute(
        "UPDATE payments SET status = 'paid', stripe_payment_intent = ? WHERE id = ? AND status <> 'paid'",
        [session.payment_intent ?? null, payment.id]
      )) as any;
      if (upd.affectedRows === 1) {
        await adjustCredits({
          userId: payment.user_id,
          delta: payment.credit_added,
          type: "topup",
          refType: "payment",
          refId: String(payment.id),
          note: "เติมเงินผ่าน Stripe",
        });
      }
    }
  } else if (event.type === "checkout.session.expired") {
    await pool.execute(
      "UPDATE payments SET status = 'failed' WHERE stripe_session_id = ? AND status = 'pending'",
      [session.id]
    );
  }

  return NextResponse.json({ received: true });
}
