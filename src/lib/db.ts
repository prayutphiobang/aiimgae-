import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

export type { RowDataPacket };

// Cached on globalThis so Next.js hot-reloads reuse one pool instead of
// creating a new one per recompile (which leaks connections until MySQL
// refuses new ones with ER_CON_COUNT_ERROR).
const g = globalThis as unknown as { __dbPool?: Pool };

/**
 * Returns a shared MySQL connection pool.
 * The pool connects directly to the configured database.
 */
export function getPool(): Pool {
  if (!g.__dbPool) {
    g.__dbPool = mysql.createPool({
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "aiimgae",
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 8),
      queueLimit: 0,
      // Recycle idle connections so a long-running dev server doesn't hold them forever.
      idleTimeout: 30_000,
      maxIdle: 4,
      enableKeepAlive: true,
      namedPlaceholders: true,
    });
  }
  return g.__dbPool;
}

/** Row shape stored in the `generations` table. */
export interface GenerationRow extends RowDataPacket {
  id: number;
  user_id?: number;
  model_id?: number | null;
  task_uid: string | null;
  seed: number;
  prompt: string;
  img_ref: string | null;
  status: string;
  result_url: string | null;
  error: string | null;
  cost_credit?: number;
  cost_coin?: number;
  refunded?: number;
  created_at: Date;
  updated_at?: Date;
}

export type { ResultSetHeader };
