/**
 * Creates / migrates the database schema.
 * Run with: npm run db:init   (safe to run repeatedly)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    console.warn("No .env file found, relying on existing environment variables.");
  }
}

async function ensureColumn(conn: any, db: string, table: string, column: string, def: string) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [db, table, column]
  );
  if (rows[0].c === 0) {
    console.log(`  + ${table}.${column}`);
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
  }
}

async function main() {
  loadEnv();
  const database = process.env.DB_NAME ?? "aiimgae";
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database });
  const T = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

  console.log("users");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NULL,
      google_id VARCHAR(64) NULL,
      avatar_url TEXT NULL,
      display_name VARCHAR(120) NULL,
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      status ENUM('active','banned') NOT NULL DEFAULT 'active',
      credit_balance BIGINT NOT NULL DEFAULT 0,
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_email (email),
      UNIQUE KEY uniq_google_id (google_id)
    ) ${T}`);
  await ensureColumn(conn, database, "users", "google_id", "VARCHAR(64) NULL");
  await ensureColumn(conn, database, "users", "avatar_url", "TEXT NULL");
  await ensureColumn(conn, database, "users", "status", "ENUM('active','banned') NOT NULL DEFAULT 'active'");
  await ensureColumn(conn, database, "users", "last_login_at", "TIMESTAMP NULL");
  // private_mode hides all of a user's work from the public explore gallery.
  await ensureColumn(conn, database, "users", "private_mode", "TINYINT(1) NOT NULL DEFAULT 0");
  // UI preferences (theme, popup confirmations) stored as JSON text.
  await ensureColumn(conn, database, "users", "prefs", "TEXT NULL");
  await conn.query("ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL").catch(() => {});

  console.log("models");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS models (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      feature_uid VARCHAR(128) NOT NULL,
      name VARCHAR(160) NOT NULL,
      description TEXT NULL,
      cost_coin INT NOT NULL DEFAULT 3,
      profit_percent DECIMAL(7,2) NOT NULL DEFAULT 100.00,
      sell_price_credit INT NOT NULL DEFAULT 6,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_feature_uid (feature_uid)
    ) ${T}`);
  await ensureColumn(conn, database, "models", "category", "VARCHAR(60) NULL");
  await ensureColumn(conn, database, "models", "thumbnail_url", "TEXT NULL");
  await ensureColumn(conn, database, "models", "badge", "VARCHAR(30) NULL");
  await ensureColumn(conn, database, "models", "instruction", "TEXT NULL");
  await ensureColumn(conn, database, "models", "sort_order", "INT NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "models", "supports_prompt", "TINYINT(1) NOT NULL DEFAULT 1");
  await ensureColumn(conn, database, "models", "supports_image", "TINYINT(1) NOT NULL DEFAULT 1");
  await ensureColumn(conn, database, "models", "requires_image", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "models", "prompt_max_len", "INT NOT NULL DEFAULT 3000");
  await ensureColumn(conn, database, "models", "est_seconds", "INT NOT NULL DEFAULT 90");
  await ensureColumn(conn, database, "models", "extra_params", "TEXT NULL");
  await ensureColumn(conn, database, "models", "default_prompt", "TEXT NULL");
  await ensureColumn(conn, database, "models", "default_negative", "TEXT NULL");
  await ensureColumn(conn, database, "models", "supports_negative", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "models", "output_type", "ENUM('image','video') NOT NULL DEFAULT 'image'");
  // Second reference image (img_ref_1), e.g. clothing for virtual try-on.
  await ensureColumn(conn, database, "models", "supports_image2", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "models", "requires_image2", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "models", "image_label", "VARCHAR(60) NULL");
  await ensureColumn(conn, database, "models", "image2_label", "VARCHAR(60) NULL");

  console.log("generations");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS generations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      model_id BIGINT UNSIGNED NULL,
      task_uid VARCHAR(128) NULL,
      seed BIGINT NOT NULL,
      prompt TEXT NOT NULL,
      img_ref TEXT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      result_url TEXT NULL,
      error TEXT NULL,
      cost_credit INT NOT NULL DEFAULT 0,
      cost_coin INT NOT NULL DEFAULT 0,
      refunded TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_task_uid (task_uid),
      KEY idx_user (user_id),
      KEY idx_created_at (created_at)
    ) ${T}`);
  await ensureColumn(conn, database, "generations", "hidden", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "generations", "negative_prompt", "TEXT NULL");
  await ensureColumn(conn, database, "generations", "thumbnail_url", "TEXT NULL");
  await ensureColumn(conn, database, "generations", "media_type", "VARCHAR(16) NOT NULL DEFAULT 'image'");
  // New work is private by default; users opt in to showing it in explore.
  await ensureColumn(conn, database, "generations", "is_public", "TINYINT(1) NOT NULL DEFAULT 0");
  await conn.query("ALTER TABLE generations ALTER COLUMN is_public SET DEFAULT 0").catch(() => {});
  await ensureColumn(conn, database, "generations", "views", "INT UNSIGNED NOT NULL DEFAULT 0");
  await ensureColumn(conn, database, "generations", "img_ref2", "TEXT NULL");
  await conn.query("ALTER TABLE generations ADD KEY idx_public (is_public, status)").catch(() => {});

  console.log("transactions");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      type ENUM('topup','spend','refund','adjust','bonus') NOT NULL,
      credit_amount BIGINT NOT NULL,
      balance_after BIGINT NOT NULL,
      ref_type VARCHAR(32) NULL,
      ref_id VARCHAR(128) NULL,
      note VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user (user_id),
      KEY idx_created_at (created_at)
    ) ${T}`);
  await conn
    .query("ALTER TABLE transactions MODIFY type ENUM('topup','spend','refund','adjust','bonus') NOT NULL")
    .catch(() => {});

  console.log("payments");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      stripe_session_id VARCHAR(255) NULL,
      stripe_payment_intent VARCHAR(255) NULL,
      amount_thb INT NOT NULL,
      credit_added BIGINT NOT NULL,
      status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_session (stripe_session_id),
      KEY idx_user (user_id)
    ) ${T}`);
  await ensureColumn(conn, database, "payments", "package_id", "BIGINT UNSIGNED NULL");

  console.log("packages");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      price_thb INT NOT NULL,
      credits INT NOT NULL,
      bonus_credits INT NOT NULL DEFAULT 0,
      badge VARCHAR(30) NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ${T}`);

  console.log("settings");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(64) NOT NULL,
      \`value\` TEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    ) ${T}`);

  console.log("support_tickets");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      subject VARCHAR(200) NOT NULL,
      status ENUM('open','answered','closed') NOT NULL DEFAULT 'open',
      last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      unread_admin TINYINT(1) NOT NULL DEFAULT 1,
      unread_user TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user (user_id),
      KEY idx_status (status),
      KEY idx_last (last_message_at)
    ) ${T}`);

  console.log("support_messages");
  await conn.query(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticket_id BIGINT UNSIGNED NOT NULL,
      sender ENUM('user','admin') NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ticket (ticket_id, id)
    ) ${T}`);

  // ---------- seed ----------
  const [[m]] = (await conn.query("SELECT COUNT(*) AS c FROM models")) as any;
  if (m.c === 0) {
    console.log("seed: default model");
    await conn.query(
      `INSERT INTO models (feature_uid, name, description, category, badge, cost_coin, profit_percent, sell_price_credit,
        thumbnail_url, instruction, est_seconds)
       VALUES (?, 'CharEdit-4.0', ?, 'Character Edit', 'HOT', 3, 100, 6,
        'https://cdn.mojen.ai/feature/feature_3FcCteXnsjxeCxxIL3LIUn2m99D/display_1.png', ?, 90)`,
      [
        process.env.MOJEN_FEATURE_UID ?? "feature_3FcCteXnsjxeCxxIL3LIUn2m99D",
        "แก้ไขตัวละครด้วย prompt เปลี่ยนท่าทางและองค์ประกอบในภาพ (720p)",
        "อัปโหลดรูปตัวละคร แล้วพิมพ์ว่าต้องการเปลี่ยนท่าทางหรือองค์ประกอบอย่างไร",
      ]
    );
  }

  const [[p]] = (await conn.query("SELECT COUNT(*) AS c FROM packages")) as any;
  if (p.c === 0) {
    console.log("seed: packages");
    const rows = [
      ["Entry", 99, 99, 0, null, 1],
      ["Small", 189, 189, 10, null, 2],
      ["Value", 349, 349, 45, "BEST SELLER", 3],
      ["Large", 849, 849, 150, null, 4],
      ["WOW", 1599, 1599, 400, "คุ้มสุด", 5],
    ];
    for (const r of rows) {
      await conn.query(
        "INSERT INTO packages (name, price_thb, credits, bonus_credits, badge, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        r
      );
    }
  }

  const defaults: Record<string, string> = {
    site_name: "AI Image Studio",
    site_tagline: "สร้างภาพสวยด้วย AI ในไม่กี่วินาที",
    announcement: "",
    support_contact: "",
    maintenance_mode: "0",
    thb_per_credit: process.env.THB_PER_CREDIT ?? "1",
    coin_cost_thb: "0.23",
    signup_bonus_credit: "10",
    min_topup_thb: "20",
  };
  for (const [k, v] of Object.entries(defaults)) {
    await conn.query("INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)", [k, v]);
  }

  await conn.end();
  console.log("Done. Database is ready.");
}

main().catch((err) => {
  console.error("DB init failed:", err.message);
  process.exit(1);
});
