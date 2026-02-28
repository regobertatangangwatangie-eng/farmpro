const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.SQLITE_FILE || path.join(__dirname, 'data', 'farmpro.db');

// ensure directory exists (avoids errors during CI runs or first startup)
const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// ===================== Marketplace Tables =====================
// User roles: farmer, buyer, seller (users can have multiple roles)
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  location TEXT,
  country TEXT,
  bio TEXT,
  avatar_url TEXT,
  verified BOOLEAN DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
)
`).run();

// Categories for farm products and farm items
db.prepare(`
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL,
  icon_url TEXT,
  created_at TEXT
)
`).run();

// Base products (coffee, cocoa, yams, tools, fertilizer, etc.)
db.prepare(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL,
  type TEXT NOT NULL,
  unit TEXT,
  image_url TEXT,
  created_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
)
`).run();

// Listings: sellers offering specific products
db.prepare(`
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  quantity REAL NOT NULL,
  quantity_unit TEXT,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  certification TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
)
`).run();

// Orders: transactions between buyers and sellers
db.prepare(`
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  delivery_address TEXT,
  delivery_date TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (listing_id) REFERENCES listings(id)
)
`).run();

// Reviews and ratings
db.prepare(`
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  rating INTEGER,
  comment TEXT,
  created_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id)
)
`).run();

// Messages between users
db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  read BOOLEAN DEFAULT 0,
  created_at TEXT,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
)
`).run();

// Favorites/Wishlist
db.prepare(`
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  UNIQUE(user_id, listing_id)
)
`).run();

// ===================== Legacy Tables (for backwards compatibility) =====================
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
