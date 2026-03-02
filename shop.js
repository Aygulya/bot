const { db } = require("./db");

function listProducts() {
  return db.prepare("SELECT * FROM products ORDER BY id DESC").all();
}

function getProduct(id) {
  return db.prepare("SELECT * FROM products WHERE id=?").get(id);
}

function addToCart(userId, productId, qty = 1) {
  const p = getProduct(productId);
  if (!p) return { ok: false, reason: "not_found" };
  if (p.stock <= 0) return { ok: false, reason: "out_of_stock" };

  const existing = db
    .prepare("SELECT qty FROM cart_items WHERE user_id=? AND product_id=?")
    .get(userId, productId);

  const newQty = (existing?.qty || 0) + qty;

  // не даём добавить больше чем stock (упрощённо)
  if (newQty > p.stock) return { ok: false, reason: "not_enough_stock" };

  db.prepare(
    "INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?) " +
      "ON CONFLICT(user_id, product_id) DO UPDATE SET qty=excluded.qty"
  ).run(userId, productId, newQty);

  return { ok: true, qty: newQty };
}

function getCart(userId) {
  const items = db
    .prepare(
      `
    SELECT ci.product_id, ci.qty, p.title, p.price, p.stock
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
    ORDER BY p.id DESC
  `
    )
    .all(userId);

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  return { items, total };
}

function clearCart(userId) {
  db.prepare("DELETE FROM cart_items WHERE user_id=?").run(userId);
}

function createOrder(userId, data) {
  const { items, total } = getCart(userId);
  if (items.length === 0) return { ok: false, reason: "empty_cart" };

  // Проверка остатков
  for (const it of items) {
    if (it.qty > it.stock) return { ok: false, reason: "not_enough_stock" };
  }

  const now = new Date().toISOString();
  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, created_at, status, name, phone, address, comment, total)
    VALUES (?, ?, 'new', ?, ?, ?, ?, ?)
  `);

  const res = insertOrder.run(
    userId,
    now,
    data.name,
    data.phone,
    data.address,
    data.comment || "",
    total
  );

  const orderId = res.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, title, price, qty)
    VALUES (?, ?, ?, ?, ?)
  `);

  const decStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id=?`);

  const tx = db.transaction(() => {
    for (const it of items) {
      insertItem.run(orderId, it.product_id, it.title, it.price, it.qty);
      decStock.run(it.qty, it.product_id);
    }
    clearCart(userId);
  });

  tx();

  return { ok: true, orderId, total, items, createdAt: now };
}

function listOrders(userId) {
  return db
    .prepare(
      `SELECT id, created_at, status, total FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 10`
    )
    .all(userId);
}

function getOrderItems(orderId) {
  return db
    .prepare(
      `SELECT title, price, qty FROM order_items WHERE order_id=? ORDER BY rowid ASC`
    )
    .all(orderId);
}
const { db } = require("./db");

function adminListOrders(limit = 20) {
  return db
    .prepare(
      `SELECT id, user_id, created_at, status, total, name, phone
       FROM orders
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit);
}

function adminGetOrder(orderId) {
  return db
    .prepare(
      `SELECT * FROM orders WHERE id=?`
    )
    .get(orderId);
}

function adminSetStatus(orderId, status) {
  const res = db
    .prepare(`UPDATE orders SET status=? WHERE id=?`)
    .run(status, orderId);
  return res.changes > 0;
}

module.exports = {
  listProducts,
  getProduct,
  addToCart,
  getCart,
  clearCart,
  createOrder,
  listOrders,
  getOrderItems,
    adminListOrders,
  adminGetOrder,
  adminSetStatus,
};
