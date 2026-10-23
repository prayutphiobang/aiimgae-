import { getPool, type RowDataPacket } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { adjustCredits } from "@/lib/credits";
import { handle, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PaymentRow extends RowDataPacket {
  id: number;
  user_id: number;
  credit_added: number;
  amount_thb: number;
  status: string;
}

/**
 * GET /api/billing/session/:id
 * Confirms a checkout session right after the user returns, so credits appear
 * immediately instead of waiting for the webhook (which may lag or be offline).
 * Crediting stays idempotent — whichever path runs first wins.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const pool = getPool();

    const [rows] = await pool.query<PaymentRow[]>(
      "SELECT id, user_id, credit_added, amount_thb, status FROM payments WHERE stripe_session_id = ? LIMIT 1",
      [id]
    );
    const payment = rows[0];
    if (!payment || payment.user_id !== user.id) throw new HttpError("ไม่พบรายการชำระเงิน", 404);

    if (payment.status === "paid") {
      return { status: "paid", credit_added: payment.credit_added, amount_thb: payment.amount_thb };
    }

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.payment_status === "paid") {
      const [upd] = (await pool.execute(
        "UPDATE payments SET status = 'paid', stripe_payment_intent = ? WHERE id = ? AND status <> 'paid'",
        [typeof session.payment_intent === "string" ? session.payment_intent : null, payment.id]
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
      return { status: "paid", credit_added: payment.credit_added, amount_thb: payment.amount_thb };
    }

    if (session.status === "expired") {
      await pool.execute("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'", [payment.id]);
      return { status: "failed" };
    }
    return { status: "pending" };
  });
}
