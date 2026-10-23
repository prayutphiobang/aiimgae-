import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { handle, HttpError, csvCell } from "@/lib/api";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|model&format=json|csv
 * Profit report over a date range.
 */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const today = new Date().toISOString().slice(0, 10);
    const past = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const from = url.searchParams.get("from") ?? past;
    const to = url.searchParams.get("to") ?? today;
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw new HttpError("รูปแบบวันที่ไม่ถูกต้อง");
    const group = url.searchParams.get("group") === "model" ? "model" : "day";
    const s = await getSettings();
    const pool = getPool();

    const range = "g.created_at >= ? AND g.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
    const ok = "g.refunded = 0 AND g.status NOT IN ('failed','error')";

    let rows: any[];
    if (group === "model") {
      [rows] = (await pool.query(
        `SELECT COALESCE(m.name, '(ลบแล้ว)') AS label, COUNT(*) AS gens,
                SUM(g.cost_credit) AS credit, SUM(g.cost_coin) AS coin
           FROM generations g LEFT JOIN models m ON m.id = g.model_id
          WHERE ${ok} AND ${range} GROUP BY m.id, m.name ORDER BY gens DESC`,
        [from, to]
      )) as any;
    } else {
      [rows] = (await pool.query(
        `SELECT DATE_FORMAT(g.created_at, '%Y-%m-%d') AS label, COUNT(*) AS gens,
                SUM(g.cost_credit) AS credit, SUM(g.cost_coin) AS coin
           FROM generations g WHERE ${ok} AND ${range}
          GROUP BY DATE_FORMAT(g.created_at, '%Y-%m-%d') ORDER BY label ASC`,
        [from, to]
      )) as any;
    }

    // Cash top-ups by day (only meaningful for day grouping).
    const topups: Record<string, number> = {};
    if (group === "day") {
      const [pr] = (await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, SUM(amount_thb) AS s FROM payments
          WHERE status='paid' AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
          GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
        [from, to]
      )) as any;
      for (const r of pr) topups[r.d] = Number(r.s);
    }

    const items = rows.map((r) => {
      const revenue = Number(r.credit) * s.thb_per_credit;
      const cost = Number(r.coin) * s.coin_cost_thb;
      return {
        label: r.label,
        gens: Number(r.gens),
        credit: Number(r.credit),
        coin: Number(r.coin),
        revenue,
        cost,
        profit: revenue - cost,
        topup_thb: group === "day" ? topups[r.label] ?? 0 : null,
      };
    });
    const total = items.reduce(
      (a, r) => ({
        gens: a.gens + r.gens,
        revenue: a.revenue + r.revenue,
        cost: a.cost + r.cost,
        profit: a.profit + r.profit,
      }),
      { gens: 0, revenue: 0, cost: 0, profit: 0 }
    );

    if (url.searchParams.get("format") === "csv") {
      const head = [group === "model" ? "model" : "date", "gens", "credit", "coin", "revenue_thb", "cost_thb", "profit_thb"];
      const lines = [head.join(",")].concat(
        items.map((r) =>
          [r.label, r.gens, r.credit, r.coin, r.revenue.toFixed(2), r.cost.toFixed(2), r.profit.toFixed(2)]
            .map(csvCell)
            .join(",")
        )
      );
      return new Response("\uFEFF" + lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="report_${group}_${from}_${to}.csv"`,
        },
      });
    }

    return { from, to, group, items, total, rates: { thb_per_credit: s.thb_per_credit, coin_cost_thb: s.coin_cost_thb } };
  });
}
