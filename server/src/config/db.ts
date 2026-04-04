import mysql, { Pool } from "mysql2/promise";
import { RowDataPacket } from "mysql2";
import { env } from "./env.js";

let pool: Pool | null = null;

async function initializeSchema(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role ENUM('worker', 'admin') NOT NULL DEFAULT 'worker',
      refresh_token TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS policies (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      policy_type ENUM('weather', 'delay', 'accident') NOT NULL,
      region VARCHAR(120) NOT NULL,
      vehicle_type ENUM('bike', 'scooter', 'car') NOT NULL,
      coverage_limit DECIMAL(12,2) NOT NULL,
      deductible DECIMAL(12,2) NOT NULL,
      monthly_base_premium DECIMAL(12,2) NOT NULL,
      status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_policies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS claims (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      policy_id BIGINT UNSIGNED NOT NULL,
      event_key VARCHAR(255) NOT NULL UNIQUE,
      trigger_type ENUM('weather', 'delay', 'accident') NOT NULL,
      trigger_score DECIMAL(6,4) NOT NULL,
      reason TEXT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      proof_image_url VARCHAR(512) NULL,
      status ENUM('triggered', 'under_review', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'triggered',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_claims_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS payouts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      claim_id BIGINT UNSIGNED NOT NULL UNIQUE,
      amount DECIMAL(12,2) NOT NULL,
      status ENUM('queued', 'processed') NOT NULL DEFAULT 'queued',
      payment_mode ENUM('upi', 'bank_account', 'online_wallet') NULL,
      payment_handle VARCHAR(120) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payouts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_payouts_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      action VARCHAR(120) NOT NULL,
      resource_type VARCHAR(120) NOT NULL,
      resource_id VARCHAR(120) NOT NULL,
      metadata JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_user_id (user_id),
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  const [proofColumnRows] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'claims' AND COLUMN_NAME = 'proof_image_url'
     LIMIT 1`
  );
  if (proofColumnRows.length === 0) {
    await db.query("ALTER TABLE claims ADD COLUMN proof_image_url VARCHAR(512) NULL AFTER amount");
  }

  const [paymentModeRows] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payouts' AND COLUMN_NAME = 'payment_mode'
     LIMIT 1`
  );
  if (paymentModeRows.length === 0) {
    await db.query("ALTER TABLE payouts ADD COLUMN payment_mode ENUM('upi', 'bank_account', 'online_wallet') NULL AFTER status");
  }

  const [paymentHandleRows] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payouts' AND COLUMN_NAME = 'payment_handle'
     LIMIT 1`
  );
  if (paymentHandleRows.length === 0) {
    await db.query("ALTER TABLE payouts ADD COLUMN payment_handle VARCHAR(120) NULL AFTER payment_mode");
  }
}

export async function connectDatabase(): Promise<void> {
  if (pool) {
    return;
  }

  const bootstrap = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    multipleStatements: true
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\``);
  await bootstrap.end();

  pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
  });

  await pool.query("SELECT 1");
  await initializeSchema(pool);
}

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function getDb(): Pool {
  if (!pool) {
    throw new Error("Database has not been initialized");
  }
  return pool;
}
