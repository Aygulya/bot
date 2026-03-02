const Database = require("better-sqlite3");

const db = new Database("shop.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  comment TEXT DEFAULT '',
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL
);
`);

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (count === 0) {
    const ins = db.prepare(
      "INSERT INTO products (title, price, description, stock) VALUES (?, ?, ?, ?)"
    );
    ins.run("Корм для котят 2 кг", 4500, "Супер-премиум, 2 кг", 20);
    ins.run("Игрушка для кошек", 1200, "Мышка с кошачьей мятой", 50);
    ins.run("Миска металлическая", 900, "350 мл", 100);
  }
}

seedIfEmpty();

module.exports = { db };
