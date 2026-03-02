
require("dotenv").config();

const { Bot, InlineKeyboard, Keyboard, session } = require("grammy");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

/* ===================== CONFIG ===================== */
const BOT_TOKEN = String(process.env.BOT_TOKEN || "").trim();
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");

const bot = new Bot(BOT_TOKEN);

const ADMIN_ID = String(process.env.ADMIN_ID || "").trim();
const SHEET_ID = String(process.env.SHEET_ID || "").trim();

const PRODUCTS_SHEET = process.env.PRODUCTS_SHEET || "products";
const ORDERS_SHEET = process.env.ORDERS_SHEET || "orders";

/* ===================== SESSION ===================== */
bot.use(
  session({
    initial: () => ({
      prepayOrderId: null, // admin waiting for amount
    }),
  })
);

/* ===================== CALLBACK ACK (FIX 400) ===================== */
bot.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    ctx.answerCallbackQuery().catch(() => {});
  }
  return next();
});

async function safeAnswer(ctx, opts) {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCallbackQuery(opts);
  } catch {
    // ignore
  }
}

/* ===================== RETRY HELPERS (FIX SHEETS TIMEOUT) ===================== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, { tries = 4, baseDelay = 400, tag = "google" } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e?.message || String(e);
      const delay = baseDelay * Math.pow(2, i); // 400,800,1600,3200
      console.warn(`⚠️ ${tag} retry ${i + 1}/${tries}: ${msg}`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/* ===================== UTILS ===================== */
const s = (x) => String(x ?? "").trim();
const normalizePhone = (input) => String(input ?? "").replace(/\D/g, "");
const isValidPhoneDigits = (digits) => /^\d{9,15}$/.test(digits);

const rub = (n) => {
  const num = Number(String(n).replace(",", "."));
  return Number.isNaN(num) ? `${n} ₽` : `${num.toLocaleString("ru-RU")} ₽`;
};

const isAdmin = (ctx) => String(ctx.from?.id || "") === ADMIN_ID;

const parseBool = (v) => {
  const t = String(v ?? "").trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes" || t === "y";
};

const toInt = (v, def = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : def;
};

/* ===================== MENUS ===================== */
function mainMenuKeyboard() {
  return new Keyboard()
    .text("🧩 Индивидуальный заказ")
    .text("🛍 Каталог")
    .row()
    .text("🧺 Корзина")
    .text("📦 Мои заказы")
    .row()
    .text("ℹ️ Поддержка")
    .resized();
}

/* ===================== GOOGLE AUTH ===================== */
function makeAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const email = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();

  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing");
  if (!privateKey || !privateKey.includes("BEGIN PRIVATE KEY"))
    throw new Error("GOOGLE_PRIVATE_KEY is missing or invalid");

  return new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/* ===================== DOC/SHEETS CACHE ===================== */
const docCache = {
  doc: null,
  ts: 0,
  ttlMs: 5 * 60_000, // 5 minutes
};

const sheetsCache = {
  productsSheet: null,
  ordersSheet: null,
  headerLoaded: false,
  sheetKey: "",
};

async function getDoc() {
  if (!SHEET_ID) throw new Error("SHEET_ID is missing");

  const fresh = docCache.doc && Date.now() - docCache.ts < docCache.ttlMs;
  if (fresh) return docCache.doc;

  const doc = new GoogleSpreadsheet(SHEET_ID, makeAuth());
  await withRetry(() => doc.loadInfo(), { tag: "doc.loadInfo" });

  docCache.doc = doc;
  docCache.ts = Date.now();
  return doc;
}

async function getSheets(doc) {
  const key = `${PRODUCTS_SHEET}__${ORDERS_SHEET}`;
  if (
    sheetsCache.productsSheet &&
    sheetsCache.ordersSheet &&
    sheetsCache.headerLoaded &&
    sheetsCache.sheetKey === key
  ) {
    return { productsSheet: sheetsCache.productsSheet, ordersSheet: sheetsCache.ordersSheet };
  }

  const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
  const ordersSheet = doc.sheetsByTitle[ORDERS_SHEET];

  if (!productsSheet) throw new Error(`Products sheet "${PRODUCTS_SHEET}" not found`);
  if (!ordersSheet) throw new Error(`Orders sheet "${ORDERS_SHEET}" not found`);

  await withRetry(() => productsSheet.loadHeaderRow(), { tag: "products.loadHeaderRow" });
  await withRetry(() => ordersSheet.loadHeaderRow(), { tag: "orders.loadHeaderRow" });

  sheetsCache.productsSheet = productsSheet;
  sheetsCache.ordersSheet = ordersSheet;
  sheetsCache.headerLoaded = true;
  sheetsCache.sheetKey = key;

  return { productsSheet, ordersSheet };
}

/* ===================== PRODUCTS CACHE ===================== */
const productsCache = {
  ts: 0,
  ttlMs: 30_000,
  products: [],
};

function normalizeProductRow(r) {
  const id = s(r.get("id"));
  const title = s(r.get("title"));
  const category = s(r.get("category"));
  const active = parseBool(r.get("active"));
  const stock = toInt(r.get("stock"), 0);

  return {
    id,
    title,
    category,
    active,
    stock,
    price: Number(String(r.get("price")).replace(",", ".")) || 0,
    description: s(r.get("description")),
    brand: s(r.get("brand")),
    tg_file_id: s(r.get("tg_file_id")),
  };
}

async function loadProductsFresh() {
  const doc = await getDoc();
  const { productsSheet } = await getSheets(doc);
  const rows = await withRetry(() => productsSheet.getRows(), { tag: "products.getRows" });

  const normalized = rows.map(normalizeProductRow).filter((p) => p.id && p.title && p.category);

  productsCache.products = normalized;
  productsCache.ts = Date.now();
  return normalized;
}

async function getProducts() {
  if (Date.now() - productsCache.ts < productsCache.ttlMs && productsCache.products.length) {
    return productsCache.products;
  }
  return loadProductsFresh();
}

async function getActiveInStockProducts() {
  const all = await getProducts();
  return all.filter((p) => p.active === true && p.stock > 0);
}

async function getProductById(id) {
  const all = await getProducts();
  return all.find((p) => String(p.id) === String(id));
}

/* ===================== CART & FLOW STATE ===================== */
const carts = new Map(); // userId -> cart[]
const flowState = new Map(); // userId -> state

function getCart(userId) {
  if (!carts.has(userId)) carts.set(userId, []);
  return carts.get(userId);
}

function cartTotal(cart) {
  return cart.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
}

function findCartItem(cart, productId) {
  return cart.find((it) => it.type === "product" && String(it.productId) === String(productId));
}

/* ===================== LAST USER INFO ===================== */
async function getLastUserInfo(userId) {
  try {
    const doc = await getDoc();
    const { ordersSheet } = await getSheets(doc);
    const rows = await withRetry(() => ordersSheet.getRows(), { tag: "orders.getRows(lastUserInfo)" });

    const userRows = rows.filter((r) => String(r.get("user_id")) === String(userId)).reverse();
    if (!userRows.length) return null;

    const last = userRows[0];
    const comm = s(last.get("comment"));
    let vin = "";
    if (comm.includes("VIN:")) vin = comm.split("VIN:")[1].split("\n")[0].trim();

    return {
      name: s(last.get("customer")),
      phone: s(last.get("phone")),
      address: s(last.get("address")),
      vin,
    };
  } catch {
    return null;
  }
}

/* ===================== ADMIN ACTIONS ===================== */
const ADMIN_STATUSES = [
  { key: "new", label: "🆕 Новый" },
  { key: "contacted", label: "☎️ Связался" },
  { key: "prepaid", label: "💳 Предоплата" },
  { key: "ordered", label: "📦 Заказано" },
  { key: "supplier", label: "🏭 Склад Китай" },
  { key: "tk", label: "🚚 Склад ТК" },
  { key: "fromChina", label: "✈️ Из Китая" },
  { key: "kz", label: "🇰🇿 В КЗ" },
  { key: "moscow", label: "🏙 В Москве" },
  { key: "delivered", label: "✅ Вручен" },
];

function adminOrderKeyboard(orderId) {
  const kb = new InlineKeyboard();
  ADMIN_STATUSES.forEach((st, idx) => {
    kb.text(st.label, `ast:${st.key}:${orderId}`);
    if (idx % 2 !== 0) kb.row();
  });
  kb.row().text("💰 Ввести предоплату", `aprepay:${orderId}`);
  return kb;
}

async function sendAdminCard(orderId) {
  if (!ADMIN_ID) return;

  const doc = await getDoc();
  const { ordersSheet } = await getSheets(doc);
  const rows = await withRetry(() => ordersSheet.getRows(), { tag: "orders.getRows(sendAdminCard)" });

  const row = rows.find((r) => s(r.get("order_id")).includes(orderId));
  if (!row) return;

  const text =
    `📦 ЗАКАЗ #${orderId}\n` +
    `Клиент: ${row.get("customer")}\n` +
    `Тел: ${row.get("phone")}\n` +
    `Адрес: ${row.get("address")}\n` +
    `Комментарий: ${row.get("comment")}\n\n` +
    `Состав:\n${row.get("items")}\n\n` +
    `Итого: ${row.get("total")}\n` +
    `Статус: ${row.get("admin_status")}\n` +
    `Предоплата: ${row.get("prepayment") || "0"} ₽`;

  const msg = await bot.api.sendMessage(ADMIN_ID, text, { reply_markup: adminOrderKeyboard(orderId) });
  row.set("admin_msg_id", String(msg.message_id));
  await withRetry(() => row.save(), { tag: "row.save(admin_msg_id)" });
}

/* ===================== SUPPORT (BUTTON FAQ) ===================== */
function supportKeyboard() {
  return new InlineKeyboard()
    .text("📦 Где посмотреть статус заказа?", "sup:q1")
    .row()
    .text("⏱ Как долго идет доставка?", "sup:q2")
    .row()
    .text("✍️ Когда мне напишут по заказу?", "sup:q3")
    .row()
    .text("⬅️ В меню", "sup:back");
}

const SUPPORT_ANSWERS = {
  q1: "📦 **Статус заказа** вы можете посмотреть прямо в боте: откройте меню **«📦 Мои заказы»**.",
  q2: "⏱ Обычно доставка занимает **до 1 месяца**. Точные сроки зависят от позиции и поставки, при необходимости уточните детали у администратора @SmithsRussia.",
  q3: "✍️ Мы связываемся по заказу **в течение 1 дня** после оформления (в рабочее время). Также, для уточнения деталей, напишите нам @SmithsRussia.",
};

/* ===================== START ===================== */
bot.command("start", (ctx) =>
  ctx.reply("Привет! Добро пожаловать в магазин автозапчастей 👋", { reply_markup: mainMenuKeyboard() })
);

/* ===================== CATALOG ===================== */
bot.hears("🛍 Каталог", async (ctx) => {
  const products = await getActiveInStockProducts();
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];

  if (!cats.length) {
    return ctx.reply("Сейчас нет товаров в наличии 😔", { reply_markup: mainMenuKeyboard() });
  }

  const kb = new InlineKeyboard();
  cats.forEach((c) => kb.text(c, `cat:${c}`).row());
  return ctx.reply("🗂 Выберите категорию:", { reply_markup: kb });
});

bot.callbackQuery("cats", async (ctx) => {
  const products = await getActiveInStockProducts();
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];

  if (!cats.length) return ctx.editMessageText("Сейчас нет товаров в наличии 😔");

  const kb = new InlineKeyboard();
  cats.forEach((c) => kb.text(c, `cat:${c}`).row());
  return ctx.editMessageText("🗂 Выберите категорию:", { reply_markup: kb });
});

bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
  const cat = ctx.match[1];

  const products = await getActiveInStockProducts();
  const inCat = products.filter((p) => p.category === cat);

  if (!inCat.length) {
    const kb = new InlineKeyboard().text("⬅️ Назад", "cats");
    return ctx.editMessageText(`В категории **${cat}** сейчас нет товаров в наличии.`, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  }

  const kb = new InlineKeyboard();
  inCat.forEach((p) => kb.text(`${p.title} — ${rub(p.price)} (остаток: ${p.stock})`, `view_p:${p.id}:${cat}`).row());
  kb.text("⬅️ Назад в категории", "cats");

  return ctx.editMessageText(`📦 Товары в категории **${cat}**:`, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
});

bot.callbackQuery(/^view_p:(.+?):(.+)$/, async (ctx) => {
  const pid = ctx.match[1];
  const cat = ctx.match[2];

  const p = await getProductById(pid);
  if (!p || !p.active) return safeAnswer(ctx, { text: "Товар не найден" });

  if (p.stock <= 0) {
    const kb = new InlineKeyboard().text("⬅️ Назад к товарам", `cat:${cat}`);
    return ctx.editMessageText(`❌ **${p.title}** сейчас нет в наличии.`, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  }

  const cart = getCart(ctx.from.id);
  const inCart = findCartItem(cart, p.id);
  const qtyInCart = inCart?.qty || 0;

  const text =
    `**${p.title}**\n` +
    `${p.description ? `\n${p.description}\n` : "\n"}` +
    `\nЦена: **${rub(p.price)}**` +
    `\nОстаток: **${p.stock}**` +
    (p.brand ? `\nБренд: ${p.brand}` : "") +
    (qtyInCart ? `\n\n🧺 В корзине: **${qtyInCart} шт.**` : "");

  const canAddMore = qtyInCart < p.stock;

  const kb = new InlineKeyboard()
    .text(canAddMore ? "➕ Добавить 1" : "⛔ Лимит по наличию", `add_p:${p.id}`)
    .row()
    .text("🧺 Корзина", "open_cart")
    .row()
    .text("⬅️ Назад к товарам", `cat:${cat}`);

  if (p.tg_file_id) {
    return ctx.replyWithPhoto(p.tg_file_id, { caption: text, parse_mode: "Markdown", reply_markup: kb });
  }
  return ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery(/^add_p:(.+)$/, async (ctx) => {
  const pid = ctx.match[1];
  const p = await getProductById(pid);

  if (!p || !p.active) return safeAnswer(ctx, { text: "Товар не найден" });
  if (p.stock <= 0) return safeAnswer(ctx, { text: "Нет в наличии" });

  const cart = getCart(ctx.from.id);
  const item = findCartItem(cart, p.id);

  const currentQty = item?.qty || 0;
  if (currentQty >= p.stock) return safeAnswer(ctx, { text: "Нельзя добавить больше, чем в наличии" });

  if (item) item.qty += 1;
  else cart.push({ type: "product", productId: p.id, title: p.title, price: Number(p.price) || 0, qty: 1 });

  return safeAnswer(ctx, { text: "✅ Добавлено в корзину!" });
});

/* ===================== CUSTOM ORDER ===================== */
bot.hears("🧩 Индивидуальный заказ", (ctx) => {
  flowState.set(ctx.from.id, { step: "wait_oem", data: {}, type: "custom" });
  ctx.reply("Введите OEM номер запчасти (или '-', если не знаете):", { reply_markup: mainMenuKeyboard() });
});

/* ===================== CART UI ===================== */
function cartKeyboard(cart, productsById) {
  const kb = new InlineKeyboard();

  cart.forEach((it, idx) => {
    const title = it.title || `Позиция ${idx + 1}`;
    const qty = it.qty || 0;

    let stockInfo = "";
    if (it.type === "product") {
      const p = productsById.get(String(it.productId));
      if (p) stockInfo = ` / остаток ${p.stock}`;
    }

    kb
      .text("➖", `cart:dec:${idx}`)
      .text(`🧺 ${qty} шт.${stockInfo}`, "cart:noop")
      .text("➕", `cart:inc:${idx}`)
      .row();
    kb.text(`❌ Удалить: ${title}`, `cart:rm:${idx}`).row();
  });

  kb.text("✅ Оформить всё", "start_checkout").row().text("🧹 Очистить", "clear_cart").row().text("⬅️ В меню", "cart:back");
  return kb;
}

async function renderCartText(userId) {
  const cart = getCart(userId);
  if (!cart.length) return { text: "Корзина пуста 🧺", kb: null };

  const products = await getProducts();
  const productsById = new Map(products.map((p) => [String(p.id), p]));

  const lines = cart.map((it, i) => {
    const lineBase = `${i + 1}. ${it.title} — ${it.qty} шт.`;
    if (it.type === "product") {
      const p = productsById.get(String(it.productId));
      const priceStr = it.price ? ` (${rub(it.price)})` : "";
      const stockStr = p ? ` | остаток: ${p.stock}` : "";
      return `${lineBase}${priceStr}${stockStr}`;
    }
    return `${lineBase} (индивидуальный запрос)`;
  });

  const total = cartTotal(cart);
  const text = `🧺 **Ваша корзина:**\n\n${lines.join("\n")}\n\nИтого: **${total ? rub(total) : "Запрос"}**`;

  return { text, kb: cartKeyboard(cart, productsById) };
}

bot.hears("🧺 Корзина", async (ctx) => {
  const { text, kb } = await renderCartText(ctx.from.id);
  if (!kb) return ctx.reply(text, { reply_markup: mainMenuKeyboard() });
  return ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery("open_cart", async (ctx) => {
  const { text, kb } = await renderCartText(ctx.from.id);
  if (!kb) return ctx.editMessageText(text);
  return ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery("sup:back", async (ctx) => {
  await ctx.editMessageText("Ок, возвращаю в меню ✅");
  return ctx.reply("Выберите действие:", { reply_markup: mainMenuKeyboard() });
});

bot.callbackQuery("cart:back", async (ctx) => {
  await ctx.editMessageText("Ок, возвращаю в меню ✅");
  return ctx.reply("Выберите действие:", { reply_markup: mainMenuKeyboard() });
});

bot.callbackQuery("cart:noop", async () => {});

bot.callbackQuery(/^cart:rm:(\d+)$/, async (ctx) => {
  const idx = Number(ctx.match[1]);
  const cart = getCart(ctx.from.id);
  if (Number.isNaN(idx) || idx < 0 || idx >= cart.length) return safeAnswer(ctx, { text: "Не найдено" });

  cart.splice(idx, 1);
  await safeAnswer(ctx, { text: "Удалено" });

  const { text, kb } = await renderCartText(ctx.from.id);
  if (!kb) return ctx.editMessageText("Корзина пуста 🧺");
  return ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery(/^cart:dec:(\d+)$/, async (ctx) => {
  const idx = Number(ctx.match[1]);
  const cart = getCart(ctx.from.id);
  const it = cart[idx];
  if (!it) return safeAnswer(ctx, { text: "Не найдено" });

  it.qty = Math.max(1, (it.qty || 1) - 1);

  const { text, kb } = await renderCartText(ctx.from.id);
  return ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery(/^cart:inc:(\d+)$/, async (ctx) => {
  const idx = Number(ctx.match[1]);
  const cart = getCart(ctx.from.id);
  const it = cart[idx];
  if (!it) return safeAnswer(ctx, { text: "Не найдено" });

  if (it.type === "product") {
    const p = await getProductById(it.productId);
    if (!p || !p.active) return safeAnswer(ctx, { text: "Товар недоступен" });

    const max = p.stock || 0;
    if (max <= 0) return safeAnswer(ctx, { text: "Нет в наличии" });
    if ((it.qty || 0) >= max) return safeAnswer(ctx, { text: "Лимит по наличию" });

    it.qty += 1;
  } else {
    return safeAnswer(ctx, { text: "Количество фиксировано" });
  }

  const { text, kb } = await renderCartText(ctx.from.id);
  return ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery("clear_cart", async (ctx) => {
  carts.set(ctx.from.id, []);
  await safeAnswer(ctx, { text: "Корзина очищена" });
  return ctx.editMessageText("Корзина пуста 🧺");
});

/* ===================== CHECKOUT ===================== */
bot.callbackQuery("start_checkout", async (ctx) => {
  const userId = ctx.from.id;
  const cart = getCart(userId);
  if (!cart.length) return safeAnswer(ctx, { text: "Корзина пуста" });

  for (const it of cart) {
    if (it.type === "product") {
      const p = await getProductById(it.productId);
      if (!p || !p.active) {
        return ctx.editMessageText(`❌ Позиция **${it.title}** сейчас недоступна. Удалите её из корзины и попробуйте снова.`, {
          parse_mode: "Markdown",
        });
      }
      if (p.stock <= 0) {
        return ctx.editMessageText(`❌ Товара **${p.title}** сейчас нет в наличии. Удалите из корзины и попробуйте снова.`, {
          parse_mode: "Markdown",
        });
      }
      if ((it.qty || 0) > p.stock) {
        return ctx.editMessageText(
          `❌ Для **${p.title}** вы выбрали **${it.qty} шт.**, но в наличии только **${p.stock}**.\nУменьшите количество в корзине.`,
          { parse_mode: "Markdown" }
        );
      }
    }
  }

  const last = await getLastUserInfo(userId);
  if (last) {
    flowState.set(userId, { step: "confirm_data", type: "checkout", data: last });
    const text =
      `Ваши данные:\n\n` +
      `👤 Имя: ${last.name}\n` +
      `📞 Тел: ${last.phone}\n` +
      `📍 Адрес: ${last.address}\n` +
      `🚗 VIN: ${last.vin}\n\n` +
      `Все верно?`;
    const kb = new InlineKeyboard().text("✅ Все верно", "data_ok").text("❌ Ввести заново", "data_new");
    return ctx.editMessageText(text, { reply_markup: kb });
  }

  flowState.set(userId, { step: "name", type: "checkout", data: {} });
  return ctx.editMessageText("Введите **Имя** получателя:", { parse_mode: "Markdown" });
});

bot.callbackQuery("data_ok", async (ctx) => {
  const state = flowState.get(ctx.from.id);
  if (state) return finalizeOrder(ctx, state);
});

bot.callbackQuery("data_new", async (ctx) => {
  flowState.set(ctx.from.id, { step: "name", type: "checkout", data: {} });
  return ctx.editMessageText("Введите **Имя** получателя:", { parse_mode: "Markdown" });
});

/* ===================== SUPPORT HANDLERS ===================== */
bot.hears("ℹ️ Поддержка", async (ctx) => ctx.reply("Выберите вопрос:", { reply_markup: supportKeyboard() }));

bot.callbackQuery(/^sup:(.+)$/, async (ctx) => {
  const key = ctx.match[1];

  if (key === "back") {
    return ctx.editMessageText("Выберите действие:", { reply_markup: mainMenuKeyboard() });
  }

  const answer = SUPPORT_ANSWERS[key];
  if (!answer) return;

  return ctx.editMessageText(answer, { parse_mode: "Markdown", reply_markup: supportKeyboard() });
});

/* ===================== TEXT INPUT FLOW ===================== */
bot.on("message:text", async (ctx, next) => {
  const userId = ctx.from.id;

  // admin prepay
  if (isAdmin(ctx) && ctx.session.prepayOrderId) {
    const amount = ctx.message.text.replace(/\D/g, "");
    const oid = ctx.session.prepayOrderId;
    ctx.session.prepayOrderId = null;

    const doc = await getDoc();
    const { ordersSheet } = await getSheets(doc);
    const rows = await withRetry(() => ordersSheet.getRows(), { tag: "orders.getRows(prepay)" });
    const row = rows.find((r) => s(r.get("order_id")).includes(oid));
    if (row) {
      row.set("prepayment", amount);
      row.set("admin_status", "prepaid");
      await withRetry(() => row.save(), { tag: "row.save(prepay)" });
      await ctx.reply(`✅ Предоплата ${amount} ₽ сохранена.`);
    }
    return;
  }

  const state = flowState.get(userId);
  if (!state) return next();

  const text = ctx.message.text.trim();

  // custom order
  if (state.type === "custom") {
    if (state.step === "wait_oem") {
      state.data.oem = text;
      state.step = "wait_list";
      return ctx.reply("Напишите, что именно нужно (перечень):");
    }
    if (state.step === "wait_list") {
      getCart(userId).push({
        type: "custom",
        title: `Инд. заказ (OEM: ${state.data.oem})`,
        info: text,
        price: 0,
        qty: 1,
      });
      flowState.delete(userId);
      return ctx.reply("✅ Запрос добавлен в корзину!", { reply_markup: mainMenuKeyboard() });
    }
  }

  // checkout flow
  if (state.type === "checkout") {
    switch (state.step) {
      case "name":
        state.data.name = text;
        state.step = "phone";
        return ctx.reply("Введите **телефон**:", { parse_mode: "Markdown" });

      case "phone": {
        const digits = normalizePhone(text);
        if (!isValidPhoneDigits(digits)) return ctx.reply("❌ Ошибка номера. Введите телефон цифрами (9–15 цифр).");
        state.data.phone = digits;
        state.step = "vin";
        return ctx.reply("Введите **VIN-код**:", { parse_mode: "Markdown" });
      }

      case "vin":
        state.data.vin = text;
        state.step = "address";
        return ctx.reply("Введите **адрес доставки (Город)**:", { parse_mode: "Markdown" });

      case "address":
        state.data.address = text;
        return finalizeOrder(ctx, state);
    }
  }
});

/* ===================== FINALIZE ORDER ===================== */
async function finalizeOrder(ctx, state) {
  const userId = ctx.from?.id;
  const cart = getCart(userId);
  if (!cart.length) {
    flowState.delete(userId);
    return ctx.reply("Корзина пуста 🧺", { reply_markup: mainMenuKeyboard() });
  }

  for (const it of cart) {
    if (it.type === "product") {
      const p = await getProductById(it.productId);
      if (!p || !p.active || p.stock <= 0) {
        flowState.delete(userId);
        return ctx.reply(`❌ Позиция **${it.title}** сейчас недоступна. Проверьте корзину.`, { parse_mode: "Markdown" });
      }
      if ((it.qty || 0) > p.stock) {
        flowState.delete(userId);
        return ctx.reply(
          `❌ Для **${p.title}** выбрано **${it.qty} шт.**, но в наличии только **${p.stock}**.\nУменьшите количество в корзине.`,
          { parse_mode: "Markdown" }
        );
      }
    }
  }

  const orderId = String(Date.now());

  const itemsText = cart
    .map((it) => {
      const q = it.qty || 1;
      if (it.type === "product") return `- ${it.title} × ${q} (${rub(it.price)})`;
      return `- ${it.title} × ${q} [${it.info || ""}]`;
    })
    .join("\n");

  const total = cartTotal(cart);

  const doc = await getDoc();
  const { ordersSheet } = await getSheets(doc);

  await withRetry(
    () =>
      ordersSheet.addRow({
        order_id: `'${orderId}`,
        created_at: new Date().toLocaleString("ru-RU"),
        customer: state.data.name,
        phone: state.data.phone,
        address: state.data.address,
        comment: `VIN: ${state.data.vin}`,
        items: itemsText,
        total: total ? total : "Запрос",
        admin_status: "new",
        client_status: "оформлен",
        user_id: String(userId),
        username: ctx.from?.username ? `@${ctx.from.username}` : "",
      }),
    { tag: "orders.addRow" }
  );

  carts.set(userId, []);
  flowState.delete(userId);

  const success = `✅ Заказ #${orderId} оформлен!`;
  if (ctx.callbackQuery) await ctx.editMessageText(success);
  else await ctx.reply(success, { reply_markup: mainMenuKeyboard() });

  await sendAdminCard(orderId);
}

/* ===================== USER ORDERS ===================== */
bot.hears("📦 Мои заказы", async (ctx) => {
  const orders = await getUserOrdersFromSheet(ctx.from.id);
  if (!orders.length) return ctx.reply("Заказов нет.", { reply_markup: mainMenuKeyboard() });

  const text =
    "Ваши последние заказы:\n\n" +
    orders
      .slice(0, 8)
      .map((o) => `#${s(o.get("order_id")).replace(/^'/, "")} — ${o.get("admin_status") || "—"}`)
      .join("\n");

  return ctx.reply(text, { reply_markup: mainMenuKeyboard() });
});

async function getUserOrdersFromSheet(userId) {
  const doc = await getDoc();
  const { ordersSheet } = await getSheets(doc);
  const rows = await withRetry(() => ordersSheet.getRows(), { tag: "orders.getRows(userOrders)" });
  return rows.filter((r) => String(r.get("user_id")) === String(userId)).reverse();
}

/* ===================== ADMIN STATUS CALLBACKS ===================== */
bot.callbackQuery(/^ast:(\w+):(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return safeAnswer(ctx, { text: "Нет доступа" });

  const status = ctx.match[1];
  const oid = ctx.match[2];

  const doc = await getDoc();
  const { ordersSheet } = await getSheets(doc);
  const rows = await withRetry(() => ordersSheet.getRows(), { tag: "orders.getRows(adminStatus)" });
  const row = rows.find((r) => s(r.get("order_id")).includes(oid));

  if (row) {
    row.set("admin_status", status);
    await withRetry(() => row.save(), { tag: "row.save(adminStatus)" });

    await safeAnswer(ctx, { text: `Статус изменен: ${status}` });

    const text =
      `📦 ЗАКАЗ #${oid}\n` +
      `Клиент: ${row.get("customer")}\n` +
      `Тел: ${row.get("phone")}\n` +
      `Адрес: ${row.get("address")}\n` +
      `Комментарий: ${row.get("comment")}\n\n` +
      `Состав:\n${row.get("items")}\n\n` +
      `Итого: ${row.get("total")}\n` +
      `Статус: ${status}\n` +
      `Предоплата: ${row.get("prepayment") || "0"} ₽`;

    try {
      await ctx.editMessageText(text, { reply_markup: adminOrderKeyboard(oid) });
    } catch {}
  }
});

bot.callbackQuery(/^aprepay:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return safeAnswer(ctx, { text: "Нет доступа" });
  ctx.session.prepayOrderId = ctx.match[1];
  return ctx.reply("Введите сумму предоплаты (цифрами):");
});

/* ===================== GLOBAL ERROR HANDLING ===================== */
bot.catch((err) => {
  console.error("❌ Bot error:", err?.error?.message || err?.message || err);
});

/* ===================== RUN ===================== */
bot.start();
console.log("✅ Bot started");