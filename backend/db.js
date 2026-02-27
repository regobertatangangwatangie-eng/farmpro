const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.SQLITE_FILE || path.join(__dirname, 'data', 'farmpro.db');
const db = new Database(dbPath);

// Create tables if not exists
db.prepare(`
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  plan_name TEXT,
  amount_usd REAL,
  customer_name TEXT,
  status TEXT,
  payment_method TEXT,
  payment_provider TEXT,
  payment_instructions TEXT,
  created_at TEXT,
  activated_at TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT,
  event_type TEXT,
  payload TEXT,
  created_at TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  name TEXT,
  platform TEXT,
  objective TEXT,
  budget REAL,
  status TEXT,
  provider_id TEXT,
  payload TEXT,
  created_at TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS ad_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad_id TEXT,
  event_type TEXT,
  data TEXT,
  created_at TEXT
)
`).run();

module.exports = db;
