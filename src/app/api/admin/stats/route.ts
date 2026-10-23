import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Profit model:
 *   cash revenue   = paid top-ups (THB)
 *   earned revenue = credits consumed × thb_per_credit
 *   cost           = coins consumed × coin_cost_thb
 *   profit         = earned revenue − cost
 */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const pool = getPool();
    const s = await getSettings();
    const ok = "g.refunded = 0 AND g.status NOT IN ('failed','error')";

    const [[pay]] = (await pool.query(
      `SELECT COALESCE(SUM(amount_thb),0) AS revenue,
              COALESCE(SUM(CASE WHEN created_at >= CURDATE() THEN amount_thb END),0) AS revenue_today,
              COUNT(*) AS paid_count
         FROM payments WHERE status = 'paid'`
    )) as any;
    const [[gen]] = (await pool.query(
      `SELECT COUNT(*) AS gens, COALESCE(SUM(cost_credit),0) AS credit_spent, COALESCE(SUM(cost_coin),0) AS coin_used,
              COALESCE(SUM(CASE WHEN g.created_at >= CURDATE() THEN 1 END),0) AS gens_today
         FROM generations g WHERE ${ok}`
    )) as any;
    const [[fail]] = (await pool.query(
      "SELECT COUNT(*) AS c FROM generations WHERE status IN ('failed','error')"
    )) as any;
    const [[usr]] = (await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(credit_balance),0) AS outstanding,
              COALESCE(SUM(CASE WHEN created_at >= CURDATE() THEN 1 END),0) AS new_today
         FROM users`
    )) as any;

    // Last 30 days, one row per day.
    const [daily] = (await pool.query(
      `SELECT DATE_FORMAT(d.day, '%Y-%m-%d') AS day,
              COALESCE(p.revenue,0) AS revenue,
              COALESCE(g.gens,0) AS gens,
              COALESCE(g.credit,0) AS credit,
              COALESCE(g.coin,0) AS coin
         FROM (SELECT DATE(DATE_SUB(CURDATE(), INTERVAL n DAY)) AS day
                 FROM (SELECT a.N + b.N*10 AS n FROM
                        (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
                         UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
                        (SELECT 0 N UNION SELECT 1 UNION SELECT 2) b) nums
                WHERE n < 30) d
         LEFT JOIN (SELECT DATE(created_at) day, SUM(amount_thb) revenue FROM payments
                     WHERE status='paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY DATE(created_at)) p
                ON p.day = d.day
         LEFT JOIN (SELECT DATE(g.created_at) day, COUNT(*) gens, SUM(cost_credit) credit, SUM(cost_coin) coin
                      FROM generations g WHERE ${ok} AND g.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                     GROUP BY DATE(g.created_at)) g
                ON g.day = d.day
        ORDER BY d.day ASC`
    )) as any;

    const [topModels] = (await pool.query(
      `SELECT m.id, m.name, COUNT(*) AS gens, SUM(g.cost_credit) AS credit, SUM(g.cost_coin) AS coin
         FROM generations g JOIN models m ON m.id = g.model_id
        WHERE ${ok} GROUP BY m.id, m.name ORDER BY gens DESC LIMIT 5`
    )) as any;

    const [recent] = await pool.query(
      `SELECT g.id, u.email, m.name AS model_name, g.status, g.result_url, g.thumbnail_url, g.media_type,
              g.cost_credit, g.created_at
         FROM generations g LEFT JOIN users u ON u.id = g.user_id LEFT JOIN models m ON m.id = g.model_id
        ORDER BY g.id DESC LIMIT 8`
    );

    const earned = Number(gen.credit_spent) * s.thb_per_credit;
    const cost = Number(gen.coin_used) * s.coin_cost_thb;
    const totalGens = Number(gen.gens) + Number(fail.c);

    return {
      revenue_thb: Number(pay.revenue),
      revenue_today: Number(pay.revenue_today),
      paid_count: Number(pay.paid_count),
      gens: Number(gen.gens),
      gens_today: Number(gen.gens_today),
      failed: Number(fail.c),
      fail_rate: totalGens ? Number(fail.c) / totalGens : 0,
      credit_spent: Number(gen.credit_spent),
      coin_used: Number(gen.coin_used),
      earned_thb: earned,
      cost_thb: cost,
      profit_thb: earned - cost,
      margin: earned ? (earned - cost) / earned : 0,
      users: Number(usr.total),
      new_users_today: Number(usr.new_today),
      outstanding_credit: Number(usr.outstanding),
      outstanding_thb: Number(usr.outstanding) * s.thb_per_credit,
      daily: daily.map((r: any) => ({
        day: r.day,
        revenue: Number(r.revenue),
        gens: Number(r.gens),
        profit: Number(r.credit) * s.thb_per_credit - Number(r.coin) * s.coin_cost_thb,
      })),
      top_models: topModels.map((r: any) => ({
        id: r.id,
        name: r.name,
        gens: Number(r.gens),
        profit: Number(r.credit) * s.thb_per_credit - Number(r.coin) * s.coin_cost_thb,
      })),
      recent,
      rates: { thb_per_credit: s.thb_per_credit, coin_cost_thb: s.coin_cost_thb },
    };
  });
}
