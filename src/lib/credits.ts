import type { PoolConnection } from "mysql2/promise";
import { getPool } from "@/lib/db";

export type TxType = "topup" | "spend" | "refund" | "adjust" | "bonus";

interface AdjustArgs {
  userId: number;
  /** positive to add, negative to subtract */
  delta: number;
  type: TxType;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
}

/**
 * Atomically adjust a user's credit balance and write a ledger row.
 * Uses a transaction with row locking to avoid race conditions.
 * Throws if the balance would go negative on a spend.
 */
export async function adjustCredits(args: AdjustArgs): Promise<number> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = (await conn.query(
      "SELECT credit_balance FROM users WHERE id = ? FOR UPDATE",
      [args.userId]
    )) as any;

    if (!rows.length) throw new Error("User not found");
    const current = Number(rows[0].credit_balance);
    const next = current + args.delta;
    if (next < 0) {
      throw new Error("Credit ไม่เพียงพอ");
    }

    await conn.query("UPDATE users SET credit_balance = ? WHERE id = ?", [
      next,
      args.userId,
    ]);

    await conn.query(
      `INSERT INTO transactions (user_id, type, credit_amount, balance_after, ref_type, ref_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        args.userId,
        args.type,
        args.delta,
        next,
        args.refType ?? null,
        args.refId ?? null,
        args.note ?? null,
      ]
    );

    await conn.commit();
    return next;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
