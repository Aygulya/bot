// // // // index.js
// // // require("dotenv").config();
// // // const { Bot, InlineKeyboard, Keyboard, session } = require("grammy");
// // // const { GoogleSpreadsheet } = require("google-spreadsheet");
// // // const { JWT } = require("google-auth-library");

// // // /* ===================== ENV ===================== */
// // // const bot = new Bot(process.env.BOT_TOKEN);

// // // const ADMIN_ID = String(process.env.ADMIN_ID || "").trim();
// // // const SHEET_ID = String(process.env.SHEET_ID || "").trim();
// // // const PRODUCTS_SHEET = process.env.PRODUCTS_SHEET || "products";
// // // const ORDERS_SHEET = process.env.ORDERS_SHEET || "orders";

// // // /* ===================== SESSION ===================== */
// // // bot.use(
// // //   session({
// // //     initial: () => ({
// // //       prepayOrderId: null, // admin waiting for amount
// // //     }),
// // //   })
// // // );

// // // /* ===================== UTILS ===================== */
// // // const s = (x) => String(x ?? "").trim();
// // // const normHeader = (x) => String(x ?? "").trim().toLowerCase();
// // // function normalizePhone(input) {
// // //   const raw = String(input ?? "").trim();
// // //   // оставляем только цифры
// // //   const digits = raw.replace(/\D/g, "");
// // //   return digits;
// // // }

// // // function isValidPhoneDigits(digits) {
// // //   // 9..15 цифр — норм для международных номеров
// // //   // (Грузия 12 символов в E.164 с кодом, РФ обычно 11 с 7)
// // //   return /^\d{9,15}$/.test(digits);
// // // }

// // // // чтобы находить order_id даже если sheets превратил в число/научную нотацию
// // // function normOrderId(v) {
// // //   const raw = String(v ?? "").trim();
// // //   if (!raw) return "";

// // //   // если записали как "'1769..."
// // //   if (raw.startsWith("'")) return raw.slice(1).replace(/\D/g, "");

// // //   // если в виде 1.769e+12
// // //   if (/[eE]/.test(raw)) {
// // //     const n = Number(raw);
// // //     if (!Number.isNaN(n)) return String(Math.round(n));
// // //   }

// // //   // обычный кейс
// // //   return raw.replace(/\D/g, "");
// // // }

// // // function rub(n) {
// // //   const num = Number(String(n).replace(",", "."));
// // //   if (Number.isNaN(num)) return `${n} ₽`;
// // //   return `${num.toLocaleString("ru-RU")} ₽`;
// // // }

// // // function isAdmin(ctx) {
// // //   return String(ctx.from?.id || "") === ADMIN_ID;
// // // }

// // // function mainMenuKeyboard() {
// // //   return new Keyboard()
// // //     .text("🛍 Каталог")
// // //     .text("🧺 Корзина")
// // //     .row()
// // //     .text("📦 Мои заказы")
// // //     .text("ℹ️ Поддержка")
// // //     .resized();
// // // }

// // // /* ===================== GOOGLE AUTH ===================== */
// // // function makeAuth() {
// // //   const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
// // //   return new JWT({
// // //     email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
// // //     key: privateKey,
// // //     scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// // //   });
// // // }

// // // async function getDoc() {
// // //   if (!SHEET_ID) throw new Error("SHEET_ID missing in .env");
// // //   if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
// // //     throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL missing in .env");
// // //   if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("GOOGLE_PRIVATE_KEY missing in .env");

// // //   const doc = new GoogleSpreadsheet(SHEET_ID, makeAuth());
// // //   await doc.loadInfo();
// // //   return doc;
// // // }

// // // async function getSheets(doc) {
// // //   const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
// // //   const ordersSheet = doc.sheetsByTitle[ORDERS_SHEET];

// // //   if (!productsSheet) throw new Error(`Нет листа "${PRODUCTS_SHEET}"`);
// // //   if (!ordersSheet) throw new Error(`Нет листа "${ORDERS_SHEET}"`);

// // //   await productsSheet.loadHeaderRow();
// // //   await ordersSheet.loadHeaderRow();

// // //   return { productsSheet, ordersSheet };
// // // }

// // // function buildHeaderMap(sheet) {
// // //   const REQUIRED = sheet.headerValues || [];
// // //   const map = new Map();
// // //   for (const h of REQUIRED) map.set(normHeader(h), h);
// // //   return map;
// // // }

// // // /* ===================== PRODUCTS ===================== */
// // // function parseStock(raw) {
// // //   const v = s(raw).toLowerCase();
// // //   const n = Number(v);
// // //   if (v !== "" && !Number.isNaN(n)) return { mode: "qty", qty: n };
// // //   if (v === "in_stock") return { mode: "in_stock" };
// // //   if (v === "to_order") return { mode: "to_order" };
// // //   return { mode: "qty", qty: 0 };
// // // }

// // // function stockMark(stock) {
// // //   if (stock.mode === "to_order") return " (под заказ)";
// // //   if (stock.mode === "qty" && stock.qty <= 0) return " (нет)";
// // //   return "";
// // // }

// // // function stockLabel(stock) {
// // //   if (stock.mode === "qty") return `Остаток: **${stock.qty}**`;
// // //   if (stock.mode === "in_stock") return `Наличие: **в наличии**`;
// // //   if (stock.mode === "to_order") return `Наличие: **под заказ**`;
// // //   return `Наличие: **—**`;
// // // }

// // // // cache
// // // let PRODUCTS_CACHE = { ts: 0, data: [] };
// // // const CACHE_TTL_MS = 15_000;

// // // async function fetchActiveProducts() {
// // //   const now = Date.now();
// // //   if (now - PRODUCTS_CACHE.ts < CACHE_TTL_MS && PRODUCTS_CACHE.data.length) return PRODUCTS_CACHE.data;

// // //   const doc = await getDoc();
// // //   const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
// // //   if (!productsSheet) throw new Error(`Нет листа "${PRODUCTS_SHEET}"`);
// // //   await productsSheet.loadHeaderRow();

// // //   const headerMap = buildHeaderMap(productsSheet);

// // //   const get = (row, key, fallback = "") => {
// // //     const real = headerMap.get(normHeader(key));
// // //     if (!real) return fallback;
// // //     const val = row.get(real);
// // //     return val == null ? fallback : val;
// // //   };

// // //   const rows = await productsSheet.getRows();

// // //   const products = rows
// // //     .map((r) => {
// // //       const id = Number(get(r, "id", 0));
// // //       const title = s(get(r, "title", ""));
// // //       const price = Number(String(get(r, "price", "0")).replace(",", ".")) || 0;

// // //       const activeRaw = s(get(r, "active", "TRUE")).toUpperCase();
// // //       const active = activeRaw === "TRUE" || activeRaw === "1" || activeRaw === "YES";

// // //       return {
// // //         row: r,
// // //         id,
// // //         title,
// // //         price,
// // //         stock: parseStock(get(r, "stock", "")),
// // //         description: s(get(r, "description", "")),
// // //         brand: s(get(r, "brand", "")),
// // //         category: s(get(r, "category", "Без категории")) || "Без категории",
// // //         tg_file_id: s(get(r, "tg_file_id", "")),
// // //         active,
// // //       };
// // //     })
// // //     .filter((p) => p.active && Number.isFinite(p.id) && p.id > 0 && p.title);

// // //   PRODUCTS_CACHE = { ts: now, data: products };
// // //   return products;
// // // }

// // // async function setProductPhotoInSheet(productId, fileId) {
// // //   const doc = await getDoc();
// // //   const { productsSheet } = await getSheets(doc);

// // //   const rows = await productsSheet.getRows();
// // //   const row = rows.find((r) => Number(r.get("id")) === Number(productId));
// // //   if (!row) return false;

// // //   row.set("tg_file_id", fileId);
// // //   await row.save();

// // //   PRODUCTS_CACHE = { ts: 0, data: [] };
// // //   return true;
// // // }

// // // /* ===================== ORDERS (SHEETS) ===================== */
// // // const REQUIRED_ORDER_HEADERS = [
// // //   "order_id",
// // //   "created_at",
// // //   "customer",
// // //   "phone",
// // //   "address",
// // //   "comment",
// // //   "items",
// // //   "total",
// // //   "admin_status",
// // //   "client_status",
// // //   "prepayment",
// // //   "status",
// // //   "user_id",
// // //   "username",
// // //   "admin_msg_id",
// // // ];

// // // async function ensureOrdersHeader(ordersSheet) {
// // //   await ordersSheet.loadHeaderRow();
// // //   const existing = (ordersSheet.headerValues || []).map((h) => String(h || "").trim());
// // //   const missing = REQUIRED_ORDER_HEADERS.filter((h) => !existing.includes(h));
// // //   if (missing.length) {
// // //     throw new Error(
// // //       `В листе "${ORDERS_SHEET}" нет колонок: ${missing.join(", ")}. ` +
// // //         `Добавь их в шапку вручную (точно так же).`
// // //     );
// // //   }
// // // }

// // // async function appendOrderToSheet(order) {
// // //   const doc = await getDoc();
// // //   const { ordersSheet } = await getSheets(doc);

// // //   await ensureOrdersHeader(ordersSheet);

// // //   const headerMap = buildHeaderMap(ordersSheet);

// // //   const rowData = {};
// // //   for (const key of REQUIRED_ORDER_HEADERS) {
// // //     const real = headerMap.get(normHeader(key));
// // //     if (!real) continue;

// // //     if (key === "order_id") {
// // //       // сохраняем как текст, чтобы sheets не превращал в scientific notation
// // //       rowData[real] = `'${normOrderId(order.order_id)}`;
// // //     } else {
// // //       rowData[real] = order[key] ?? "";
// // //     }
// // //   }

// // //   await ordersSheet.addRow(rowData);
// // // }

// // // async function findOrderRowById(orderId) {
// // //   const doc = await getDoc();
// // //   const { ordersSheet } = await getSheets(doc);

// // //   await ensureOrdersHeader(ordersSheet);
// // //   const headerMap = buildHeaderMap(ordersSheet);
// // //   const realOrderIdHeader = headerMap.get("order_id") || "order_id";

// // //   const target = normOrderId(orderId);
// // //   if (!target) return { ordersSheet, row: null };

// // //   // paging to avoid huge sheet issues
// // //   const PAGE = 500;
// // //   let offset = 0;

// // //   while (true) {
// // //     const rows = await ordersSheet.getRows({ offset, limit: PAGE });
// // //     if (!rows.length) break;

// // //     const found = rows.find((r) => normOrderId(r.get(realOrderIdHeader)) === target);
// // //     if (found) return { ordersSheet, row: found };

// // //     if (rows.length < PAGE) break;
// // //     offset += PAGE;
// // //   }

// // //   return { ordersSheet, row: null };
// // // }

// // // async function updateOrderRow(orderId, patch) {
// // //   const { row } = await findOrderRowById(orderId);
// // //   if (!row) return null;

// // //   for (const [k, v] of Object.entries(patch)) row.set(k, v);
// // //   await row.save();
// // //   return row;
// // // }

// // // async function getUserOrdersFromSheet(userId) {
// // //   const doc = await getDoc();
// // //   const { ordersSheet } = await getSheets(doc);

// // //   await ensureOrdersHeader(ordersSheet);

// // //   const rows = await ordersSheet.getRows({ offset: 0, limit: 5000 });

// // //   return rows
// // //     .filter((r) => String(r.get("user_id") ?? "") === String(userId))
// // //     .sort((a, b) => Number(normOrderId(b.get("order_id"))) - Number(normOrderId(a.get("order_id"))));
// // // }

// // // async function getLastUserInfo(userId) {
// // //   const rows = await getUserOrdersFromSheet(userId);
// // //   if (!rows.length) return null;
// // //   const o = rows[0];
// // //   return {
// // //     customer: s(o.get("customer")),
// // //     phone: s(o.get("phone")),
// // //     address: s(o.get("address")),
// // //   };
// // // }

// // // /* ===================== STATUSES ===================== */
// // // const ADMIN_STATUSES = [
// // //   { key: "new", label: "🆕 Новый" },
// // //   { key: "contacted", label: "☎️ Связался" },
// // //   { key: "prepaid", label: "💳 Предоплата внесена" },
// // //   { key: "ordered", label: "📦 Заказано" },
// // //   { key: "supplier", label: "🏭 Прибыл на склад поставщика" },
// // //   { key: "tk", label: "🚚 Прибыл на склад ТК" },
// // //   { key: "fromChina", label: "Отправлено из Китая" },
// // //   { key: "kz", label: "🇰🇿 Прибыл в КЗ" },
// // //   { key: "moscow", label: "🏙 Получен в Москве" },
// // //   { key: "delivered", label: "✅ Вручен" },
// // // ];

// // // function mapAdminToClient(adminStatus) {
// // //   const st = s(adminStatus).toLowerCase();

// // //   if (st === "delivered") return "получен";
// // //   if (st === "supplier") return "прибыло на склад Китай";
// // //   if (st === "fromchina") return "отправлено из Китая";
// // //   if (st === "moscow") return "прибыло в Москву";
// // //   if (st === "contacted" || st === "prepaid") return "подтвержден";

// // //   return "оформлен";
// // // }


// // // // клиенту шлём ТОЛЬКО:
// // // // 1) подтвержден (contacted или prepaid)
// // // // 2) в пути — только когда admin_status стал ordered
// // // // 3) получен — delivered
// // // function shouldNotifyClient(prevClientStatus, nextClientStatus) {
// // //   const prev = s(prevClientStatus).toLowerCase();
// // //   const next = s(nextClientStatus).toLowerCase();

// // //   const ALLOWED = new Set([
// // //     "подтвержден",
// // //     "прибыло на склад китай",
// // //     "отправлено из китая",
// // //     "прибыло в москву",
// // //     "получен",
// // //   ]);

// // //   // шлём только если:
// // //   // 1) новый статус входит в список
// // //   // 2) и он реально поменялся
// // //   if (ALLOWED.has(next) && next !== prev) return true;

// // //   return false;
// // // }


// // // /* ===================== KEYBOARDS ===================== */
// // // function adminOrderKeyboard(orderId) {
// // //   const oid = normOrderId(orderId);
// // //   const kb = new InlineKeyboard();

// // //   for (const st of ADMIN_STATUSES) {
// // //     kb.text(st.label, `ast:${st.key}:${oid}`).row();
// // //   }

// // //   // отдельная кнопка — ввести сумму
// // //   kb.text("💰 Ввести предоплату", `aprepay:${oid}`).row();

// // //   return kb;
// // // }

// // // /* ===================== ADMIN CARD ===================== */
// // // async function buildAdminCardText(row) {
// // //   const oid = normOrderId(row.get("order_id"));
// // //   const prepay = s(row.get("prepayment"));
// // //   const adminStatus = s(row.get("admin_status")) || "new";
// // //   const clientStatus = s(row.get("client_status")) || mapAdminToClient(adminStatus);

// // //   return (
// // //     `📦 ЗАКАЗ #${oid}\n` +
// // //     `От: ${s(row.get("username")) || "-"} (id:${s(row.get("user_id"))})\n` +
// // //     `Имя: ${s(row.get("customer"))}\n` +
// // //     `Тел: ${s(row.get("phone"))}\n` +
// // //     `Адрес: ${s(row.get("address"))}\n` +
// // //     `Комментарий: ${s(row.get("comment")) || "-"}\n\n` +
// // //     `${s(row.get("items"))}\n\n` +
// // //     `Итого: ${rub(row.get("total"))}\n` +
// // //     `Admin: ${adminStatus}\n` +
// // //     `Client: ${clientStatus}\n` +
// // //     `Предоплата: ${prepay ? rub(prepay) : "-"}`
// // //   );
// // // }

// // // async function refreshAdminCard(row) {
// // //   const msgId = Number(row.get("admin_msg_id") || 0);
// // //   if (!msgId) return;

// // //   const text = await buildAdminCardText(row);

// // //   try {
// // //     await bot.api.editMessageText(ADMIN_ID, msgId, text, {
// // //       reply_markup: adminOrderKeyboard(normOrderId(row.get("order_id"))),
// // //     });
// // //   } catch (e) {
// // //     const msg = String(e?.message || "");
// // //     // Telegram 400: message is not modified — это нормально, просто игнорим
// // //     if (msg.includes("message is not modified")) return;
// // //     throw e;
// // //   }
// // // }

// // // async function sendAdminCard(orderId) {
// // //   if (!ADMIN_ID) return null;

// // //   const { row } = await findOrderRowById(orderId);
// // //   if (!row) return null;

// // //   const text = await buildAdminCardText(row);

// // //   try {
// // //     const msg = await bot.api.sendMessage(ADMIN_ID, text, {
// // //       reply_markup: adminOrderKeyboard(normOrderId(orderId)),
// // //     });
// // //     return msg.message_id;
// // //   } catch (e) {
// // //     // частый кейс: админ не нажал /start в чате с ботом
// // //     console.error("ADMIN SEND ERROR:", e?.message || e);
// // //     return null;
// // //   }
// // // }

// // // /* ===================== CART ===================== */
// // // const carts = new Map(); // userId -> Map(productId -> qty)
// // // function getCart(userId) {
// // //   if (!carts.has(userId)) carts.set(userId, new Map());
// // //   return carts.get(userId);
// // // }

// // // /* ===================== CATALOG UI ===================== */
// // // async function showCategories(ctx) {
// // //   const products = await fetchActiveProducts();
// // //   const categories = [...new Set(products.map((p) => p.category))]
// // //     .filter(Boolean)
// // //     .sort((a, b) => a.localeCompare(b, "ru"));

// // //   if (!categories.length) {
// // //     return ctx.reply("Каталог пуст.", { reply_markup: mainMenuKeyboard() });
// // //   }

// // //   const kb = new InlineKeyboard();
// // //   for (const c of categories) kb.text(c, `cat:${c}`).row();

// // //   return ctx.reply("🗂 Выбери категорию:", { reply_markup: kb });
// // // }

// // // async function showProductsByCategory(ctx, category) {
// // //   const products = await fetchActiveProducts();
// // //   const filtered = products.filter((p) => p.category === category);

// // //   const kb = new InlineKeyboard().text("⬅️ Категории", "cats").row();
// // //   for (const p of filtered) kb.text(`${p.title}${stockMark(p.stock)}`, `p:${p.id}`).row();

// // //   return ctx.editMessageText(`🛍 Категория: **${category}**`, {
// // //     parse_mode: "Markdown",
// // //     reply_markup: kb,
// // //   });
// // // }

// // // async function showProductCard(ctx, productId) {
// // //   const products = await fetchActiveProducts();
// // //   const p = products.find((x) => x.id === Number(productId));
// // //   if (!p) return ctx.answerCallbackQuery({ text: "Товар не найден" });

// // //   const caption =
// // //     `**${p.title}**\n` +
// // //     `${p.brand ? `Бренд: ${p.brand}\n` : ""}` +
// // //     `${p.description || ""}\n\n` +
// // //     `Цена: **${rub(p.price)}**\n` +
// // //     `${stockLabel(p.stock)}`;

// // //   const kb = new InlineKeyboard()
// // //     .text("➕ В корзину", `add:${p.id}`)
// // //     .row()
// // //     .text("⬅️ Назад", `cat:${p.category}`);

// // //   await ctx.answerCallbackQuery();

// // //   if (p.tg_file_id) {
// // //     return ctx.replyWithPhoto(p.tg_file_id, { caption, parse_mode: "Markdown", reply_markup: kb });
// // //   }

// // //   return ctx.editMessageText(caption, { parse_mode: "Markdown", reply_markup: kb });
// // // }

// // // /* ===================== CART UI ===================== */
// // // async function showCart(ctx) {
// // //   const userId = ctx.from.id;
// // //   const cart = getCart(userId);

// // //   if (cart.size === 0) {
// // //     return ctx.reply("Корзина пуста 🧺", {
// // //       reply_markup: new InlineKeyboard().text("🛍 В каталог", "cats"),
// // //     });
// // //   }

// // //   const products = await fetchActiveProducts();
// // //   const items = [];

// // //   for (const [pid, qty] of cart.entries()) {
// // //     const p = products.find((x) => x.id === Number(pid));
// // //     if (p) items.push({ ...p, qty });
// // //   }

// // //   const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

// // //   const lines = items.map(
// // //     (it, i) => `${i + 1}) ${it.title}\n   ${it.qty} × ${rub(it.price)} = ${rub(it.price * it.qty)}`
// // //   );

// // //   const kb = new InlineKeyboard()
// // //     .text("✅ Оформить", "checkout")
// // //     .row()
// // //     .text("🧹 Очистить", "cart_clear")
// // //     .row()
// // //     .text("🛍 В каталог", "cats");

// // //   return ctx.reply(`🧺 **Корзина**\n\n${lines.join("\n\n")}\n\nИтого: **${rub(total)}**`, {
// // //     parse_mode: "Markdown",
// // //     reply_markup: kb,
// // //   });
// // // }

// // // /* ===================== CHECKOUT FLOW ===================== */
// // // const checkoutState = new Map(); // userId -> { step, data }

// // // bot.callbackQuery("checkout", async (ctx) => {
// // //   const userId = ctx.from.id;
// // //   const cart = getCart(userId);

// // //   if (!cart.size) {
// // //     await ctx.answerCallbackQuery({ text: "Корзина пуста" });
// // //     return;
// // //   }

// // //   await ctx.answerCallbackQuery();

// // //   const last = await getLastUserInfo(userId);

// // //   checkoutState.set(userId, {
// // //     step: "name",
// // //     data: {
// // //       name: last?.customer || "",
// // //       phone: last?.phone || "",
// // //       address: last?.address || "",
// // //       comment: "",
// // //     },
// // //   });

// // //   const hint = last
// // //     ? `\n\nМожно отправить **+** или **=** чтобы использовать прошлые данные:\nИмя: ${last.customer || "-"}\nТел: ${last.phone || "-"}\nАдрес: ${last.address || "-"}`
// // //     : "";

// // //   return ctx.reply("Оформление заказа ✅\n\nВведи **имя** получателя:" + hint, {
// // //     parse_mode: "Markdown",
// // //   });
// // // });


// // // bot.on("message:text", async (ctx, next) => {
// // //   /* ===== ADMIN: waiting prepay amount ===== */
// // //   if (isAdmin(ctx) && ctx.session.prepayOrderId) {
// // //     const oid = ctx.session.prepayOrderId;
// // //     const amount = Number(ctx.message.text.replace(/[^\d.,]/g, "").replace(",", "."));
// // //     if (!amount || amount <= 0) return ctx.reply("Введи сумму числом (например 5000)");

// // //     ctx.session.prepayOrderId = null;

// // //     // читаем "до", чтобы решить уведомление
// // //     const { row: before } = await findOrderRowById(oid);
// // //     if (!before) return ctx.reply("Заказ не найден в таблице.");
// // //     const prevClient = s(before.get("client_status"));

// // //     const admin_status = "prepaid";
// // //     const client_status = mapAdminToClient(admin_status);

// // //     const row = await updateOrderRow(oid, {
// // //       prepayment: amount,
// // //       admin_status,
// // //       client_status,
// // //       status: admin_status,
// // //     });

// // //     if (!row) return ctx.reply("Заказ не найден в таблице.");

// // //     await refreshAdminCard(row);

// // //     // клиенту оповещаем только по правилам
// // //     const userId = s(row.get("user_id"));
// // //     if (userId && shouldNotifyClient(prevClient, client_status, admin_status)) {
// // //       try {
// // //         await bot.api.sendMessage(
// // //           userId,
// // //           `Обновление по заказу #${normOrderId(row.get("order_id"))}: **${client_status}**`,
// // //           { parse_mode: "Markdown" }
// // //         );
// // //       } catch (_) {}
// // //     }

// // //     return ctx.reply(`✅ Предоплата сохранена: ${rub(amount)}`);
// // //   }

// // //   /* ===== CHECKOUT: steps ===== */
// // //   const userId = ctx.from.id;
// // //   const state = checkoutState.get(userId);
// // //   if (!state) return next();

// // //   const text = (ctx.message.text || "").trim();
// // //   const shortcut = text === "+" || text === "=";

// // //   // если + или = — прыгаем сразу к комменту (если есть префилл)
// // //   if (shortcut) {
// // //     const hasPrefill =
// // //       (state.data?.name && state.data.name.trim()) ||
// // //       (state.data?.phone && state.data.phone.trim()) ||
// // //       (state.data?.address && state.data.address.trim());

// // //     if (!hasPrefill) {
// // //       state.step = "name";
// // //       return ctx.reply("Прошлых данных нет. Введи **имя** получателя:", { parse_mode: "Markdown" });
// // //     }

// // //     state.step = "comment";
// // //     return ctx.reply("Комментарий? (если нет — напиши `-`)", { parse_mode: "Markdown" });
// // //   }

// // //   if (state.step === "name") {
// // //     state.data.name = text;
// // //     state.step = "phone";
// // //     return ctx.reply("Телефон получателя:", { parse_mode: "Markdown" });
// // //   }

// // //   if (state.step === "phone") {
// // //     const digits = normalizePhone(text);

// // //     if (!isValidPhoneDigits(digits)) {
// // //       return ctx.reply(
// // //         "❌ Номер телефона некорректный.\n\n" +
// // //           "Введи номер **только цифрами** (можно с +, пробелами, скобками — я сам очищу).\n" +
// // //           "Примеры:\n" +
// // //           "• 79991234567\n" +
// // //           "• +7 999 123-45-67\n" +
// // //           "• +995 555 12 34 56",
// // //         { parse_mode: "Markdown" }
// // //       );
// // //     }

// // //     // сохраняем в чистом виде (цифры)
// // //     state.data.phone = digits;

// // //     state.step = "address";
// // //     return ctx.reply("Адрес доставки:", { parse_mode: "Markdown" });
// // //   }

// // //   if (state.step === "address") {
// // //     state.data.address = text;
// // //     state.step = "comment";
// // //     return ctx.reply("Комментарий? (если нет — напиши `-`)", { parse_mode: "Markdown" });
// // //   }

// // //   if (state.step === "comment") {
// // //     state.data.comment = text === "-" ? "" : text;

// // //     const cart = getCart(userId);
// // //     const products = await fetchActiveProducts();

// // //     const items = [];
// // //     for (const [pid, qty] of cart.entries()) {
// // //       const p = products.find((x) => x.id === Number(pid));
// // //       if (!p) continue;

// // //       if (p.stock.mode === "qty" && p.stock.qty < qty) {
// // //         checkoutState.delete(userId);
// // //         return ctx.reply(`Недостаточно остатка для "${p.title}". Проверь корзину.`);
// // //       }
// // //       if (p.stock.mode === "qty" && p.stock.qty <= 0) {
// // //         checkoutState.delete(userId);
// // //         return ctx.reply(`Товар "${p.title}" сейчас недоступен.`);
// // //       }

// // //       items.push({ title: p.title, price: p.price, qty, stockMode: p.stock.mode });
// // //     }

// // //     if (!items.length) {
// // //       checkoutState.delete(userId);
// // //       return ctx.reply("Корзина пуста.");
// // //     }

// // //     const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
// // //     const createdAt = new Date().toISOString();
// // //     const orderId = String(Date.now()); // строкой

// // //     const itemsText = items
// // //       .map((it, i) => {
// // //         const extra = it.stockMode === "to_order" ? " (под заказ)" : "";
// // //         return `${i + 1}) ${it.title}${extra} — ${it.qty} × ${rub(it.price)}`;
// // //       })
// // //       .join("\n");

// // //     cart.clear();
// // //     checkoutState.delete(userId);

// // //     const admin_status = "new";
// // //     const client_status = mapAdminToClient(admin_status);

// // //     // клиенту
// // //     await ctx.reply(
// // //       `Заказ **#${orderId}** оформлен ✅\nИтого: **${rub(total)}**\nСтатус: **${client_status}**`,
// // //       { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() }
// // //     );

// // //     // запись в sheet + отправка админу
// // //     try {
// // //       await appendOrderToSheet({
// // //         order_id: orderId,
// // //         created_at: createdAt,
// // //         customer: state.data.name,
// // //         phone: state.data.phone,
// // //         address: state.data.address,
// // //         comment: state.data.comment || "",
// // //         items: itemsText,
// // //         total: total,
// // //         admin_status,
// // //         client_status,
// // //         prepayment: "",
// // //         status: admin_status,
// // //         user_id: String(userId),
// // //         username: ctx.from.username ? `@${ctx.from.username}` : "",
// // //         admin_msg_id: "",
// // //       });

// // //       const adminMsgId = await sendAdminCard(orderId);
// // //       if (adminMsgId) {
// // //         await updateOrderRow(orderId, { admin_msg_id: String(adminMsgId) });
// // //       }
// // //     } catch (e) {
// // //       console.error("CHECKOUT ERROR:", e?.message || e);
// // //       try {
// // //         await bot.api.sendMessage(
// // //           ADMIN_ID,
// // //           `⚠️ Ошибка при оформлении заказа #${orderId}\n${String(e?.message || e)}`
// // //         );
// // //       } catch (_) {}
// // //     }

// // //     return;
// // //   }

// // //   return next();
// // // };

// // // /* ===================== ADMIN BUTTONS ===================== */
// // // bot.callbackQuery(/^ast:([^:]+):(\d+)$/, async (ctx) => {
// // //   if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "Нет доступа" });

// // //   const admin_status = ctx.match[1];
// // //   const orderId = ctx.match[2];

// // //   // найдём текущую строку, чтобы знать прошлый client_status
// // //   const { row: beforeRow } = await findOrderRowById(orderId);
// // //   if (!beforeRow) {
// // //     await ctx.answerCallbackQuery({ text: "Заказ не найден в таблице" });
// // //     return;
// // //   }

// // //   const prevClientStatus = s(beforeRow.get("client_status"));
// // //   const client_status = mapAdminToClient(admin_status);

// // //   const row = await updateOrderRow(orderId, {
// // //     admin_status,
// // //     client_status,
// // //     status: admin_status,
// // //   });

// // //   if (!row) {
// // //     await ctx.answerCallbackQuery({ text: "Заказ не найден в таблице" });
// // //     return;
// // //   }

// // //   await refreshAdminCard(row);
// // //   await ctx.answerCallbackQuery({ text: "Обновлено ✅" });

// // //   // уведомляем клиента только по правилам
// // //   const userId = s(row.get("user_id"));
// // //   if (userId && shouldNotifyClient(prevClientStatus, client_status, admin_status)) {
// // //     try {
// // //       await bot.api.sendMessage(
// // //         userId,
// // //         `Обновление по заказу #${normOrderId(row.get("order_id"))}: **${client_status}**`,
// // //         { parse_mode: "Markdown" }
// // //       );
// // //     } catch (_) {}
// // //   }
// // // });

// // // bot.callbackQuery(/^aprepay:(\d+)$/, async (ctx) => {
// // //   if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "Нет доступа" });

// // //   const orderId = ctx.match[1];
// // //   const { row } = await findOrderRowById(orderId);

// // //   if (!row) {
// // //     await ctx.answerCallbackQuery({ text: "Заказ не найден" });
// // //     return;
// // //   }

// // //   ctx.session.prepayOrderId = normOrderId(orderId);
// // //   await ctx.answerCallbackQuery();
// // //   return ctx.reply(`💳 Введи сумму предоплаты для заказа #${orderId} (просто число):`);
// // // });

// // // /* ===================== MENU ===================== */
// // // bot.command("start", async (ctx) => {
// // //   await ctx.reply("Привет! Это магазин-бот 🛒", { reply_markup: mainMenuKeyboard() });
// // // });

// // // bot.command("id", (ctx) => ctx.reply(`Твой Telegram ID: ${ctx.from.id}`));

// // // bot.hears("🛍 Каталог", async (ctx) => showCategories(ctx));
// // // bot.hears("🧺 Корзина", async (ctx) => showCart(ctx));

// // // bot.hears("📦 Мои заказы", async (ctx) => {
// // //   const orders = await getUserOrdersFromSheet(ctx.from.id);
// // //   if (!orders.length) return ctx.reply("Заказов пока нет 📦");

// // //   const lines = orders.slice(0, 30).map((o) => {
// // //     const oid = normOrderId(o.get("order_id"));
// // //     const st = s(o.get("client_status")) || "оформлен";
// // //     const total = o.get("total");
// // //     const date = s(o.get("created_at")).slice(0, 10);
// // //     return `#${oid} • ${st} • ${rub(total)} • ${date}`;
// // //   });

// // //   return ctx.reply(`📦 Мои заказы:\n\n${lines.join("\n")}`);
// // // });

// // // bot.hears("ℹ️ Поддержка", (ctx) => ctx.reply("Напиши сюда, и мы ответим."));

// // // bot.callbackQuery("cats", async (ctx) => {
// // //   await ctx.answerCallbackQuery();
// // //   return showCategories(ctx);
// // // });

// // // bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
// // //   const category = ctx.match[1];
// // //   await ctx.answerCallbackQuery();
// // //   return showProductsByCategory(ctx, category);
// // // });

// // // bot.callbackQuery(/^p:(\d+)$/, async (ctx) => {
// // //   const id = Number(ctx.match[1]);
// // //   return showProductCard(ctx, id);
// // // });

// // // bot.callbackQuery(/^add:(\d+)$/, async (ctx) => {
// // //   const productId = Number(ctx.match[1]);
// // //   const userId = ctx.from.id;

// // //   const products = await fetchActiveProducts();
// // //   const p = products.find((x) => x.id === productId);
// // //   if (!p) return ctx.answerCallbackQuery({ text: "Товар не найден" });

// // //   if (p.stock.mode === "qty" && p.stock.qty <= 0) {
// // //     return ctx.answerCallbackQuery({ text: "Нет в наличии" });
// // //   }

// // //   const cart = getCart(userId);
// // //   const current = cart.get(productId) || 0;
// // //   const nextQty = current + 1;

// // //   if (p.stock.mode === "qty" && nextQty > p.stock.qty) {
// // //     return ctx.answerCallbackQuery({ text: "Недостаточно на складе" });
// // //   }

// // //   cart.set(productId, nextQty);
// // //   const msg = p.stock.mode === "to_order" ? "Добавлено ✅ (под заказ)" : "Добавлено ✅";
// // //   return ctx.answerCallbackQuery({ text: msg });
// // // });

// // // bot.callbackQuery("cart_clear", async (ctx) => {
// // //   getCart(ctx.from.id).clear();
// // //   await ctx.answerCallbackQuery({ text: "Очищено" });
// // //   return showCart(ctx);
// // // });

// // // /* ===================== ADMIN: SET PHOTO ===================== */
// // // // usage: send photo -> reply /set_photo 12
// // // bot.command("set_photo", async (ctx) => {
// // //   if (!isAdmin(ctx)) return;

// // //   const productId = Number(ctx.message.text.split(" ")[1]);
// // //   if (!productId) return ctx.reply("Формат: ответь на фото командой\n/set_photo 12");

// // //   const reply = ctx.message.reply_to_message;
// // //   if (!reply || !reply.photo) return ctx.reply("Нужно ответить (reply) на сообщение с фото.");

// // //   const photo = reply.photo[reply.photo.length - 1];
// // //   const fileId = photo.file_id;

// // //   const ok = await setProductPhotoInSheet(productId, fileId);
// // //   if (!ok) return ctx.reply("Товар с таким id не найден в листе products.");

// // //   return ctx.reply(`✅ Фото привязано к товару #${productId}\nfile_id сохранён в Google Sheets.`);
// // // });

// // // /* ===================== SHEET -> TG SYNC (POLL) ===================== */
// // // /*
// // //   "и наоборот тоже": если ты руками в таблице поменяла admin_status / prepayment,
// // //   бот раз в 25 секунд подтянет изменения и обновит админ-карточку + (по правилам) уведомит клиента.
// // // */
// // // const lastSeen = new Map(); // orderId -> signature

// // // async function pollOrdersAndRefresh() {
// // //   try {
// // //     const doc = await getDoc();
// // //     const { ordersSheet } = await getSheets(doc);
// // //     await ensureOrdersHeader(ordersSheet);

// // //     const rows = await ordersSheet.getRows({ offset: 0, limit: 1500 });

// // //     for (const row of rows) {
// // //       const oid = normOrderId(row.get("order_id"));
// // //       if (!oid) continue;

// // //       const adminMsgId = Number(row.get("admin_msg_id") || 0);
// // //       if (!adminMsgId) continue; // нечего обновлять в TG

// // //       const admin_status = s(row.get("admin_status")) || "new";
// // //       const computedClient = mapAdminToClient(admin_status);
// // //       const existingClient = s(row.get("client_status")) || "";
// // //       const prepayment = s(row.get("prepayment"));
// // //       const status = s(row.get("status"));

// // //       // если в таблице поменяли admin_status, но забыли client_status — выравниваем
// // //       if (existingClient !== computedClient) {
// // //         row.set("client_status", computedClient);
// // //         row.set("status", admin_status);
// // //         await row.save();
// // //       }

// // //       const sigAfter = [
// // //         s(row.get("admin_status")),
// // //         s(row.get("client_status")),
// // //         s(row.get("prepayment")),
// // //         s(row.get("status")),
// // //       ].join("|");

// // //       if (lastSeen.get(oid) === sigAfter) continue;

// // //       // обновим админ карточку
// // //       await refreshAdminCard(row);

// // //       // уведомления клиенту — только по правилам
// // //       const userId = s(row.get("user_id"));
// // //       if (userId && shouldNotifyClient(existingClient, computedClient, admin_status)) {
// // //         try {
// // //           await bot.api.sendMessage(userId, `Обновление по заказу #${oid}: **${computedClient}**`, {
// // //             parse_mode: "Markdown",
// // //           });
// // //         } catch (_) {}
// // //       }

// // //       lastSeen.set(oid, sigAfter);
// // //     }
// // //   } catch (e) {
// // //     console.error("POLL ERROR:", e?.message || e);
// // //   }
// // // }

// // // // каждые 25 секунд
// // // setInterval(pollOrdersAndRefresh, 25_000);

// // // /* ===================== ERRORS ===================== */
// // // bot.catch((err) => console.error("BOT ERROR:", err));
// // // bot.start();
// // // console.log("Bot started");
// // require("dotenv").config();
// // const { Bot, InlineKeyboard, Keyboard, session } = require("grammy");
// // const { GoogleSpreadsheet } = require("google-spreadsheet");
// // const { JWT } = require("google-auth-library");

// // /* ===================== ENV ===================== */
// // const bot = new Bot(process.env.BOT_TOKEN);

// // const ADMIN_ID = String(process.env.ADMIN_ID || "").trim();
// // const SHEET_ID = String(process.env.SHEET_ID || "").trim();
// // const PRODUCTS_SHEET = process.env.PRODUCTS_SHEET || "products";
// // const ORDERS_SHEET = process.env.ORDERS_SHEET || "orders";

// // /* ===================== SESSION ===================== */
// // bot.use(
// //   session({
// //     initial: () => ({
// //       prepayOrderId: null, // admin waiting for amount
// //     }),
// //   })
// // );

// // /* ===================== UTILS ===================== */
// // const s = (x) => String(x ?? "").trim();
// // const normHeader = (x) => String(x ?? "").trim().toLowerCase();
// // function normalizePhone(input) {
// //   const raw = String(input ?? "").trim();
// //   // оставляем только цифры
// //   const digits = raw.replace(/\D/g, "");
// //   return digits;
// // }

// // function isValidPhoneDigits(digits) {
// //   // 9..15 цифр — норм для международных номеров
// //   // (Грузия 12 символов в E.164 с кодом, РФ обычно 11 с 7)
// //   return /^\d{9,15}$/.test(digits);
// // }

// // // чтобы находить order_id даже если sheets превратил в число/научную нотацию
// // function normOrderId(v) {
// //   const raw = String(v ?? "").trim();
// //   if (!raw) return "";

// //   // если записали как "'1769..."
// //   if (raw.startsWith("'")) return raw.slice(1).replace(/\D/g, "");

// //   // если в виде 1.769e+12
// //   if (/[eE]/.test(raw)) {
// //     const n = Number(raw);
// //     if (!Number.isNaN(n)) return String(Math.round(n));
// //   }

// //   // обычный кейс
// //   return raw.replace(/\D/g, "");
// // }

// // function rub(n) {
// //   const num = Number(String(n).replace(",", "."));
// //   if (Number.isNaN(num)) return `${n} ₽`;
// //   return `${num.toLocaleString("ru-RU")} ₽`;
// // }

// // function isAdmin(ctx) {
// //   return String(ctx.from?.id || "") === ADMIN_ID;
// // }

// // function mainMenuKeyboard() {
// //   return new Keyboard()
// //     .text("🛍 Каталог")
// //     .text("🧺 Корзина")
// //     .row()
// //     .text("📦 Мои заказы")
// //     .text("ℹ️ Поддержка")
// //     .resized();
// // }

// // /* ===================== GOOGLE AUTH ===================== */
// // function makeAuth() {
// //   const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
// //   return new JWT({
// //     email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
// //     key: privateKey,
// //     scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// //   });
// // }

// // async function getDoc() {
// //   if (!SHEET_ID) throw new Error("SHEET_ID missing in .env");
// //   if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
// //     throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL missing in .env");
// //   if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("GOOGLE_PRIVATE_KEY missing in .env");

// //   const doc = new GoogleSpreadsheet(SHEET_ID, makeAuth());
// //   await doc.loadInfo();
// //   return doc;
// // }

// // async function getSheets(doc) {
// //   const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
// //   const ordersSheet = doc.sheetsByTitle[ORDERS_SHEET];

// //   if (!productsSheet) throw new Error(`Нет листа "${PRODUCTS_SHEET}"`);
// //   if (!ordersSheet) throw new Error(`Нет листа "${ORDERS_SHEET}"`);

// //   await productsSheet.loadHeaderRow();
// //   await ordersSheet.loadHeaderRow();

// //   return { productsSheet, ordersSheet };
// // }

// // function buildHeaderMap(sheet) {
// //   const REQUIRED = sheet.headerValues || [];
// //   const map = new Map();
// //   for (const h of REQUIRED) map.set(normHeader(h), h);
// //   return map;
// // }

// // /* ===================== PRODUCTS ===================== */
// // function parseStock(raw) {
// //   const v = s(raw).toLowerCase();
// //   const n = Number(v);
// //   if (v !== "" && !Number.isNaN(n)) return { mode: "qty", qty: n };
// //   if (v === "in_stock") return { mode: "in_stock" };
// //   if (v === "to_order") return { mode: "to_order" };
// //   return { mode: "qty", qty: 0 };
// // }

// // function stockMark(stock) {
// //   if (stock.mode === "to_order") return " (под заказ)";
// //   if (stock.mode === "qty" && stock.qty <= 0) return " (нет)";
// //   return "";
// // }

// // function stockLabel(stock) {
// //   if (stock.mode === "qty") return `Остаток: **${stock.qty}**`;
// //   if (stock.mode === "in_stock") return `Наличие: **в наличии**`;
// //   if (stock.mode === "to_order") return `Наличие: **под заказ**`;
// //   return `Наличие: **—**`;
// // }

// // // cache
// // let PRODUCTS_CACHE = { ts: 0, data: [] };
// // const CACHE_TTL_MS = 15_000;

// // async function fetchActiveProducts() {
// //   const now = Date.now();
// //   if (now - PRODUCTS_CACHE.ts < CACHE_TTL_MS && PRODUCTS_CACHE.data.length) return PRODUCTS_CACHE.data;

// //   const doc = await getDoc();
// //   const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
// //   if (!productsSheet) throw new Error(`Нет листа "${PRODUCTS_SHEET}"`);
// //   await productsSheet.loadHeaderRow();

// //   const headerMap = buildHeaderMap(productsSheet);

// //   const get = (row, key, fallback = "") => {
// //     const real = headerMap.get(normHeader(key));
// //     if (!real) return fallback;
// //     const val = row.get(real);
// //     return val == null ? fallback : val;
// //   };

// //   const rows = await productsSheet.getRows();

// //   const products = rows
// //     .map((r) => {
// //       const id = Number(get(r, "id", 0));
// //       const title = s(get(r, "title", ""));
// //       const price = Number(String(get(r, "price", "0")).replace(",", ".")) || 0;

// //       const activeRaw = s(get(r, "active", "TRUE")).toUpperCase();
// //       const active = activeRaw === "TRUE" || activeRaw === "1" || activeRaw === "YES";

// //       return {
// //         row: r,
// //         id,
// //         title,
// //         price,
// //         stock: parseStock(get(r, "stock", "")),
// //         description: s(get(r, "description", "")),
// //         brand: s(get(r, "brand", "")),
// //         category: s(get(r, "category", "Без категории")) || "Без категории",
// //         tg_file_id: s(get(r, "tg_file_id", "")),
// //         active,
// //       };
// //     })
// //     .filter((p) => p.active && Number.isFinite(p.id) && p.id > 0 && p.title);

// //   PRODUCTS_CACHE = { ts: now, data: products };
// //   return products;
// // }

// // async function setProductPhotoInSheet(productId, fileId) {
// //   const doc = await getDoc();
// //   const { productsSheet } = await getSheets(doc);

// //   const rows = await productsSheet.getRows();
// //   const row = rows.find((r) => Number(r.get("id")) === Number(productId));
// //   if (!row) return false;

// //   row.set("tg_file_id", fileId);
// //   await row.save();

// //   PRODUCTS_CACHE = { ts: 0, data: [] };
// //   return true;
// // }

// // /* ===================== ORDERS (SHEETS) ===================== */
// // const REQUIRED_ORDER_HEADERS = [
// //   "order_id",
// //   "created_at",
// //   "customer",
// //   "phone",
// //   "address",
// //   "comment",
// //   "items",
// //   "total",
// //   "admin_status",
// //   "client_status",
// //   "prepayment",
// //   "status",
// //   "user_id",
// //   "username",
// //   "admin_msg_id",
// // ];

// // async function ensureOrdersHeader(ordersSheet) {
// //   await ordersSheet.loadHeaderRow();
// //   const existing = (ordersSheet.headerValues || []).map((h) => String(h || "").trim());
// //   const missing = REQUIRED_ORDER_HEADERS.filter((h) => !existing.includes(h));
// //   if (missing.length) {
// //     throw new Error(
// //       `В листе "${ORDERS_SHEET}" нет колонок: ${missing.join(", ")}. ` +
// //         `Добавь их в шапку вручную (точно так же).`
// //     );
// //   }
// // }

// // async function appendOrderToSheet(order) {
// //   const doc = await getDoc();
// //   const { ordersSheet } = await getSheets(doc);

// //   await ensureOrdersHeader(ordersSheet);

// //   const headerMap = buildHeaderMap(ordersSheet);

// //   const rowData = {};
// //   for (const key of REQUIRED_ORDER_HEADERS) {
// //     const real = headerMap.get(normHeader(key));
// //     if (!real) continue;

// //     if (key === "order_id") {
// //       // сохраняем как текст, чтобы sheets не превращал в scientific notation
// //       rowData[real] = `'${normOrderId(order.order_id)}`;
// //     } else {
// //       rowData[real] = order[key] ?? "";
// //     }
// //   }

// //   await ordersSheet.addRow(rowData);
// // }

// // async function findOrderRowById(orderId) {
// //   const doc = await getDoc();
// //   const { ordersSheet } = await getSheets(doc);

// //   await ensureOrdersHeader(ordersSheet);
// //   const headerMap = buildHeaderMap(ordersSheet);
// //   const realOrderIdHeader = headerMap.get("order_id") || "order_id";

// //   const target = normOrderId(orderId);
// //   if (!target) return { ordersSheet, row: null };

// //   // paging to avoid huge sheet issues
// //   const PAGE = 500;
// //   let offset = 0;

// //   while (true) {
// //     const rows = await ordersSheet.getRows({ offset, limit: PAGE });
// //     if (!rows.length) break;

// //     const found = rows.find((r) => normOrderId(r.get(realOrderIdHeader)) === target);
// //     if (found) return { ordersSheet, row: found };

// //     if (rows.length < PAGE) break;
// //     offset += PAGE;
// //   }

// //   return { ordersSheet, row: null };
// // }

// // async function updateOrderRow(orderId, patch) {
// //   const { row } = await findOrderRowById(orderId);
// //   if (!row) return null;

// //   for (const [k, v] of Object.entries(patch)) row.set(k, v);
// //   await row.save();
// //   return row;
// // }

// // async function getUserOrdersFromSheet(userId) {
// //   const doc = await getDoc();
// //   const { ordersSheet } = await getSheets(doc);

// //   await ensureOrdersHeader(ordersSheet);

// //   const rows = await ordersSheet.getRows({ offset: 0, limit: 5000 });

// //   return rows
// //     .filter((r) => String(r.get("user_id") ?? "") === String(userId))
// //     .sort((a, b) => Number(normOrderId(b.get("order_id"))) - Number(normOrderId(a.get("order_id"))));
// // }

// // async function getLastUserInfo(userId) {
// //   const rows = await getUserOrdersFromSheet(userId);
// //   if (!rows.length) return null;
// //   const o = rows[0];
// //   return {
// //     customer: s(o.get("customer")),
// //     phone: s(o.get("phone")),
// //     address: s(o.get("address")),
// //   };
// // }

// // /* ===================== STATUSES ===================== */
// // const ADMIN_STATUSES = [
// //   { key: "new", label: "🆕 Новый" },
// //   { key: "contacted", label: "☎️ Связался" },
// //   { key: "prepaid", label: "💳 Предоплата внесена" },
// //   { key: "ordered", label: "📦 Заказано" },
// //   { key: "supplier", label: "🏭 Прибыл на склад поставщика" },
// //   { key: "tk", label: "🚚 Прибыл на склад ТК" },
// //   { key: "fromChina", label: "Отправлено из Китая" },
// //   { key: "kz", label: "🇰🇿 Прибыл в КЗ" },
// //   { key: "moscow", label: "🏙 Получен в Москве" },
// //   { key: "delivered", label: "✅ Вручен" },
// // ];

// // function mapAdminToClient(adminStatus) {
// //   const st = s(adminStatus).toLowerCase();

// //   if (st === "delivered") return "получен";
// //   if (st === "supplier") return "прибыло на склад Китай";
// //   if (st === "fromchina") return "отправлено из Китая";
// //   if (st === "moscow") return "прибыло в Москву";
// //   if (st === "contacted" || st === "prepaid") return "подтвержден";

// //   return "оформлен";
// // }

// // // клиенту шлём ТОЛЬКО:
// // // 1) подтвержден (contacted или prepaid)
// // // 2) в пути — только когда admin_status стал ordered
// // // 3) получен — delivered
// // function shouldNotifyClient(prevClientStatus, nextClientStatus) {
// //   const prev = s(prevClientStatus).toLowerCase();
// //   const next = s(nextClientStatus).toLowerCase();

// //   const ALLOWED = new Set([
// //     "подтвержден",
// //     "прибыло на склад китай",
// //     "отправлено из китая",
// //     "прибыло в москву",
// //     "получен",
// //   ]);

// //   // шлём только если:
// //   // 1) новый статус входит в список
// //   // 2) и он реально поменялся
// //   if (ALLOWED.has(next) && next !== prev) return true;

// //   return false;
// // }

// // /* ===================== KEYBOARDS ===================== */
// // function adminOrderKeyboard(orderId) {
// //   const oid = normOrderId(orderId);
// //   const kb = new InlineKeyboard();

// //   for (const st of ADMIN_STATUSES) {
// //     kb.text(st.label, `ast:${st.key}:${oid}`).row();
// //   }

// //   // отдельная кнопка — ввести сумму
// //   kb.text("💰 Ввести предоплату", `aprepay:${oid}`).row();

// //   return kb;
// // }

// // /* ===================== ADMIN CARD ===================== */
// // async function buildAdminCardText(row) {
// //   const oid = normOrderId(row.get("order_id"));
// //   const prepay = s(row.get("prepayment"));
// //   const adminStatus = s(row.get("admin_status")) || "new";
// //   const clientStatus = s(row.get("client_status")) || mapAdminToClient(adminStatus);

// //   return (
// //     `📦 ЗАКАЗ #${oid}\n` +
// //     `От: ${s(row.get("username")) || "-"} (id:${s(row.get("user_id"))})\n` +
// //     `Имя: ${s(row.get("customer"))}\n` +
// //     `Тел: ${s(row.get("phone"))}\n` +
// //     `Адрес: ${s(row.get("address"))}\n` +
// //     `Комментарий: ${s(row.get("comment")) || "-"}\n\n` +
// //     `${s(row.get("items"))}\n\n` +
// //     `Итого: ${rub(row.get("total"))}\n` +
// //     `Admin: ${adminStatus}\n` +
// //     `Client: ${clientStatus}\n` +
// //     `Предоплата: ${prepay ? rub(prepay) : "-"}`
// //   );
// // }

// // async function refreshAdminCard(row) {
// //   const msgId = Number(row.get("admin_msg_id") || 0);
// //   if (!msgId) return;

// //   const text = await buildAdminCardText(row);

// //   try {
// //     await bot.api.editMessageText(ADMIN_ID, msgId, text, {
// //       reply_markup: adminOrderKeyboard(normOrderId(row.get("order_id"))),
// //     });
// //   } catch (e) {
// //     const msg = String(e?.message || "");
// //     // Telegram 400: message is not modified — это нормально, просто игнорим
// //     if (msg.includes("message is not modified")) return;
// //     throw e;
// //   }
// // }

// // async function sendAdminCard(orderId) {
// //   if (!ADMIN_ID) return null;

// //   const { row } = await findOrderRowById(orderId);
// //   if (!row) return null;

// //   const text = await buildAdminCardText(row);

// //   try {
// //     const msg = await bot.api.sendMessage(ADMIN_ID, text, {
// //       reply_markup: adminOrderKeyboard(normOrderId(orderId)),
// //     });
// //     return msg.message_id;
// //   } catch (e) {
// //     // частый кейс: админ не нажал /start в чате с ботом
// //     console.error("ADMIN SEND ERROR:", e?.message || e);
// //     return null;
// //   }
// // }

// // /* ===================== CART ===================== */
// // const carts = new Map(); // userId -> Map(productId -> qty)
// // function getCart(userId) {
// //   if (!carts.has(userId)) carts.set(userId, new Map());
// //   return carts.get(userId);
// // }

// // /* ===================== CATALOG UI ===================== */
// // async function showCategories(ctx) {
// //   const products = await fetchActiveProducts();
// //   const categories = [...new Set(products.map((p) => p.category))]
// //     .filter(Boolean)
// //     .sort((a, b) => a.localeCompare(b, "ru"));

// //   if (!categories.length) {
// //     return ctx.reply("Каталог пуст.", { reply_markup: mainMenuKeyboard() });
// //   }

// //   const kb = new InlineKeyboard();
// //   for (const c of categories) kb.text(c, `cat:${c}`).row();

// //   return ctx.reply("🗂 Выбери категорию:", { reply_markup: kb });
// // }

// // async function showProductsByCategory(ctx, category) {
// //   const products = await fetchActiveProducts();
// //   const filtered = products.filter((p) => p.category === category);

// //   const kb = new InlineKeyboard().text("⬅️ Категории", "cats").row();
// //   for (const p of filtered) kb.text(`${p.title}${stockMark(p.stock)}`, `p:${p.id}`).row();

// //   return ctx.editMessageText(`🛍 Категория: **${category}**`, {
// //     parse_mode: "Markdown",
// //     reply_markup: kb,
// //   });
// // }

// // async function showProductCard(ctx, productId) {
// //   const products = await fetchActiveProducts();
// //   const p = products.find((x) => x.id === Number(productId));
// //   if (!p) return ctx.answerCallbackQuery({ text: "Товар не найден" });

// //   const caption =
// //     `**${p.title}**\n` +
// //     `${p.brand ? `Бренд: ${p.brand}\n` : ""}` +
// //     `${p.description || ""}\n\n` +
// //     `Цена: **${rub(p.price)}**\n` +
// //     `${stockLabel(p.stock)}`;

// //   const kb = new InlineKeyboard()
// //     .text("➕ В корзину", `add:${p.id}`)
// //     .row()
// //     .text("⬅️ Назад", `cat:${p.category}`);

// //   await ctx.answerCallbackQuery();

// //   if (p.tg_file_id) {
// //     return ctx.replyWithPhoto(p.tg_file_id, { caption, parse_mode: "Markdown", reply_markup: kb });
// //   }

// //   return ctx.editMessageText(caption, { parse_mode: "Markdown", reply_markup: kb });
// // }

// // /* ===================== CART UI ===================== */
// // async function showCart(ctx) {
// //   const userId = ctx.from.id;
// //   const cart = getCart(userId);

// //   if (cart.size === 0) {
// //     return ctx.reply("Корзина пуста 🧺", {
// //       reply_markup: new InlineKeyboard().text("🛍 В каталог", "cats"),
// //     });
// //   }

// //   const products = await fetchActiveProducts();
// //   const items = [];

// //   for (const [pid, qty] of cart.entries()) {
// //     const p = products.find((x) => x.id === Number(pid));
// //     if (p) items.push({ ...p, qty });
// //   }

// //   const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

// //   const lines = items.map(
// //     (it, i) => `${i + 1}) ${it.title}\n   ${it.qty} × ${rub(it.price)} = ${rub(it.price * it.qty)}`
// //   );

// //   const kb = new InlineKeyboard()
// //     .text("✅ Оформить", "checkout")
// //     .row()
// //     .text("🧹 Очистить", "cart_clear")
// //     .row()
// //     .text("🛍 В каталог", "cats");

// //   return ctx.reply(`🧺 **Корзина**\n\n${lines.join("\n\n")}\n\nИтого: **${rub(total)}**`, {
// //     parse_mode: "Markdown",
// //     reply_markup: kb,
// //   });
// // }

// // /* ===================== CHECKOUT FLOW ===================== */
// // const checkoutState = new Map(); // userId -> { step, data }

// // bot.callbackQuery("checkout", async (ctx) => {
// //   const userId = ctx.from.id;
// //   const cart = getCart(userId);

// //   if (!cart.size) {
// //     await ctx.answerCallbackQuery({ text: "Корзина пуста" });
// //     return;
// //   }

// //   await ctx.answerCallbackQuery();

// //   const last = await getLastUserInfo(userId);

// //   checkoutState.set(userId, {
// //     step: "name",
// //     data: {
// //       name: last?.customer || "",
// //       phone: last?.phone || "",
// //       address: last?.address || "",
// //       comment: "",
// //     },
// //   });

// //   const hint = last
// //     ? `\n\nМожно отправить **+** или **=** чтобы использовать прошлые данные:\nИмя: ${last.customer || "-"}\nТел: ${last.phone || "-"}\nАдрес: ${last.address || "-"}`
// //     : "";

// //   return ctx.reply("Оформление заказа ✅\n\nВведи **имя** получателя:" + hint, {
// //     parse_mode: "Markdown",
// //   });
// // });

// // bot.on("message:text", async (ctx, next) => {
// //   /* ===== ADMIN: waiting prepay amount ===== */
// //   if (isAdmin(ctx) && ctx.session.prepayOrderId) {
// //     const oid = ctx.session.prepayOrderId;
// //     const amount = Number(ctx.message.text.replace(/[^\d.,]/g, "").replace(",", "."));
// //     if (!amount || amount <= 0) return ctx.reply("Введи сумму числом (например 5000)");

// //     ctx.session.prepayOrderId = null;

// //     // читаем "до", чтобы решить уведомление
// //     const { row: before } = await findOrderRowById(oid);
// //     if (!before) return ctx.reply("Заказ не найден в таблице.");
// //     const prevClient = s(before.get("client_status"));

// //     const admin_status = "prepaid";
// //     const client_status = mapAdminToClient(admin_status);

// //     const row = await updateOrderRow(oid, {
// //       prepayment: amount,
// //       admin_status,
// //       client_status,
// //       status: admin_status,
// //     });

// //     if (!row) return ctx.reply("Заказ не найден в таблице.");

// //     await refreshAdminCard(row);

// //     // клиенту оповещаем только по правилам
// //     const userId = s(row.get("user_id"));
// //     if (userId && shouldNotifyClient(prevClient, client_status, admin_status)) {
// //       try {
// //         await bot.api.sendMessage(
// //           userId,
// //           `Обновление по заказу #${normOrderId(row.get("order_id"))}: **${client_status}**`,
// //           { parse_mode: "Markdown" }
// //         );
// //       } catch (_) {}
// //     }

// //     return ctx.reply(`✅ Предоплата сохранена: ${rub(amount)}`);
// //   }

// //   /* ===== CHECKOUT: steps ===== */
// //   const userId = ctx.from.id;
// //   const state = checkoutState.get(userId);
// //   if (!state) return next();

// //   const text = (ctx.message.text || "").trim();
// //   const shortcut = text === "+" || text === "=";

// //   // если + или = — прыгаем сразу к комменту (если есть префилл)
// //   if (shortcut) {
// //     const hasPrefill =
// //       (state.data?.name && state.data.name.trim()) ||
// //       (state.data?.phone && state.data.phone.trim()) ||
// //       (state.data?.address && state.data.address.trim());

// //     if (!hasPrefill) {
// //       state.step = "name";
// //       return ctx.reply("Прошлых данных нет. Введи **имя** получателя:", { parse_mode: "Markdown" });
// //     }

// //     state.step = "comment";
// //     return ctx.reply("Комментарий? (если нет — напиши `-`)", { parse_mode: "Markdown" });
// //   }

// //   if (state.step === "name") {
// //     state.data.name = text;
// //     state.step = "phone";
// //     return ctx.reply("Телефон получателя:", { parse_mode: "Markdown" });
// //   }

// //   if (state.step === "phone") {
// //     const digits = normalizePhone(text);

// //     if (!isValidPhoneDigits(digits)) {
// //       return ctx.reply(
// //         "❌ Номер телефона некорректный.\n\n" +
// //           "Введи номер **только цифрами** (можно с +, пробелами, скобками — я сам очищу).\n" +
// //           "Примеры:\n" +
// //           "• 79991234567\n" +
// //           "• +7 999 123-45-67\n" +
// //           "• +995 555 12 34 56",
// //         { parse_mode: "Markdown" }
// //       );
// //     }

// //     // сохраняем в чистом виде (цифры)
// //     state.data.phone = digits;

// //     state.step = "address";
// //     return ctx.reply("Адрес доставки:", { parse_mode: "Markdown" });
// //   }

// //   if (state.step === "address") {
// //     state.data.address = text;
// //     state.step = "comment";
// //     return ctx.reply("Комментарий? (если нет — напиши `-`)", { parse_mode: "Markdown" });
// //   }

// //   if (state.step === "comment") {
// //     state.data.comment = text === "-" ? "" : text;

// //     const cart = getCart(userId);
// //     const products = await fetchActiveProducts();

// //     const items = [];
// //     for (const [pid, qty] of cart.entries()) {
// //       const p = products.find((x) => x.id === Number(pid));
// //       if (!p) continue;

// //       if (p.stock.mode === "qty" && p.stock.qty < qty) {
// //         checkoutState.delete(userId);
// //         return ctx.reply(`Недостаточно остатка для "${p.title}". Проверь корзину.`);
// //       }
// //       if (p.stock.mode === "qty" && p.stock.qty <= 0) {
// //         checkoutState.delete(userId);
// //         return ctx.reply(`Товар "${p.title}" сейчас недоступен.`);
// //       }

// //       items.push({ title: p.title, price: p.price, qty, stockMode: p.stock.mode });
// //     }

// //     if (!items.length) {
// //       checkoutState.delete(userId);
// //       return ctx.reply("Корзина пуста.");
// //     }

// //     const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
// //     const createdAt = new Date().toISOString();
// //     const orderId = String(Date.now()); // строкой

// //     const itemsText = items
// //       .map((it, i) => {
// //         const extra = it.stockMode === "to_order" ? " (под заказ)" : "";
// //         return `${i + 1}) ${it.title}${extra} — ${it.qty} × ${rub(it.price)}`;
// //       })
// //       .join("\n");

// //     cart.clear();
// //     checkoutState.delete(userId);

// //     const admin_status = "new";
// //     const client_status = mapAdminToClient(admin_status);

// //     // клиенту
// //     await ctx.reply(
// //       `Заказ **#${orderId}** оформлен ✅\nИтого: **${rub(total)}**\nСтатус: **${client_status}**`,
// //       { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() }
// //     );

// //     // запись в sheet + отправка админу
// //     try {
// //       await appendOrderToSheet({
// //         order_id: orderId,
// //         created_at: createdAt,
// //         customer: state.data.name,
// //         phone: state.data.phone,
// //         address: state.data.address,
// //         comment: state.data.comment || "",
// //         items: itemsText,
// //         total: total,
// //         admin_status,
// //         client_status,
// //         prepayment: "",
// //         status: admin_status,
// //         user_id: String(userId),
// //         username: ctx.from.username ? `@${ctx.from.username}` : "",
// //         admin_msg_id: "",
// //       });

// //       const adminMsgId = await sendAdminCard(orderId);
// //       if (adminMsgId) {
// //         await updateOrderRow(orderId, { admin_msg_id: String(adminMsgId) });
// //       }
// //     } catch (e) {
// //       console.error("CHECKOUT ERROR:", e?.message || e);
// //       try {
// //         await bot.api.sendMessage(
// //           ADMIN_ID,
// //           `⚠️ Ошибка при оформлении заказа #${orderId}\n${String(e?.message || e)}`
// //         );
// //       } catch (_) {}
// //     }

// //     return;
// //   }

// //   return next();
// // });

// // /* ===================== ADMIN BUTTONS ===================== */
// // bot.callbackQuery(/^ast:([^:]+):(\d+)$/, async (ctx) => {
// //   if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "Нет доступа" });

// //   const admin_status = ctx.match[1];
// //   const orderId = ctx.match[2];

// //   // найдём текущую строку, чтобы знать прошлый client_status
// //   const { row: beforeRow } = await findOrderRowById(orderId);
// //   if (!beforeRow) {
// //     await ctx.answerCallbackQuery({ text: "Заказ не найден в таблице" });
// //     return;
// //   }

// //   const prevClientStatus = s(beforeRow.get("client_status"));
// //   const client_status = mapAdminToClient(admin_status);

// //   const row = await updateOrderRow(orderId, {
// //     admin_status,
// //     client_status,
// //     status: admin_status,
// //   });

// //   if (!row) {
// //     await ctx.answerCallbackQuery({ text: "Заказ не найден в таблице" });
// //     return;
// //   }

// //   await refreshAdminCard(row);
// //   await ctx.answerCallbackQuery({ text: "Обновлено ✅" });

// //   // уведомляем клиента только по правилам
// //   const userId = s(row.get("user_id"));
// //   if (userId && shouldNotifyClient(prevClientStatus, client_status, admin_status)) {
// //     try {
// //       await bot.api.sendMessage(
// //         userId,
// //         `Обновление по заказу #${normOrderId(row.get("order_id"))}: **${client_status}**`,
// //         { parse_mode: "Markdown" }
// //       );
// //     } catch (_) {}
// //   }
// // });

// // bot.callbackQuery(/^aprepay:(\d+)$/, async (ctx) => {
// //   if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "Нет доступа" });

// //   const orderId = ctx.match[1];
// //   const { row } = await findOrderRowById(orderId);

// //   if (!row) {
// //     await ctx.answerCallbackQuery({ text: "Заказ не найден" });
// //     return;
// //   }

// //   ctx.session.prepayOrderId = normOrderId(orderId);
// //   await ctx.answerCallbackQuery();
// //   return ctx.reply(`💳 Введи сумму предоплаты для заказа #${orderId} (просто число):`);
// // });

// // /* ===================== MENU ===================== */
// // bot.command("start", async (ctx) => {
// //   await ctx.reply("Привет! Это магазин-бот 🛒", { reply_markup: mainMenuKeyboard() });
// // });

// // bot.command("id", (ctx) => ctx.reply(`Твой Telegram ID: ${ctx.from.id}`));

// // bot.hears("🛍 Каталог", async (ctx) => showCategories(ctx));
// // bot.hears("🧺 Корзина", async (ctx) => showCart(ctx));

// // bot.hears("📦 Мои заказы", async (ctx) => {
// //   const orders = await getUserOrdersFromSheet(ctx.from.id);
// //   if (!orders.length) return ctx.reply("Заказов пока нет 📦");

// //   const lines = orders.slice(0, 30).map((o) => {
// //     const oid = normOrderId(o.get("order_id"));
// //     const st = s(o.get("client_status")) || "оформлен";
// //     const total = o.get("total");
// //     const date = s(o.get("created_at")).slice(0, 10);
// //     return `#${oid} • ${st} • ${rub(total)} • ${date}`;
// //   });

// //   return ctx.reply(`📦 Мои заказы:\n\n${lines.join("\n")}`);
// // });

// // bot.hears("ℹ️ Поддержка", (ctx) => ctx.reply("Напиши сюда, и мы ответим."));

// // bot.callbackQuery("cats", async (ctx) => {
// //   await ctx.answerCallbackQuery();
// //   return showCategories(ctx);
// // });

// // bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
// //   const category = ctx.match[1];
// //   await ctx.answerCallbackQuery();
// //   return showProductsByCategory(ctx, category);
// // });

// // bot.callbackQuery(/^p:(\d+)$/, async (ctx) => {
// //   const id = Number(ctx.match[1]);
// //   return showProductCard(ctx, id);
// // });

// // bot.callbackQuery(/^add:(\d+)$/, async (ctx) => {
// //   const productId = Number(ctx.match[1]);
// //   const userId = ctx.from.id;

// //   const products = await fetchActiveProducts();
// //   const p = products.find((x) => x.id === productId);
// //   if (!p) return ctx.answerCallbackQuery({ text: "Товар не найден" });

// //   if (p.stock.mode === "qty" && p.stock.qty <= 0) {
// //     return ctx.answerCallbackQuery({ text: "Нет в наличии" });
// //   }

// //   const cart = getCart(userId);
// //   const current = cart.get(productId) || 0;
// //   const nextQty = current + 1;

// //   if (p.stock.mode === "qty" && nextQty > p.stock.qty) {
// //     return ctx.answerCallbackQuery({ text: "Недостаточно на складе" });
// //   }

// //   cart.set(productId, nextQty);
// //   const msg = p.stock.mode === "to_order" ? "Добавлено ✅ (под заказ)" : "Добавлено ✅";
// //   return ctx.answerCallbackQuery({ text: msg });
// // });

// // bot.callbackQuery("cart_clear", async (ctx) => {
// //   getCart(ctx.from.id).clear();
// //   await ctx.answerCallbackQuery({ text: "Очищено" });
// //   return showCart(ctx);
// // });

// // /* ===================== ADMIN: SET PHOTO ===================== */
// // // usage: send photo -> reply /set_photo 12
// // bot.command("set_photo", async (ctx) => {
// //   if (!isAdmin(ctx)) return;

// //   const productId = Number(ctx.message.text.split(" ")[1]);
// //   if (!productId) return ctx.reply("Формат: ответь на фото командой\n/set_photo 12");

// //   const reply = ctx.message.reply_to_message;
// //   if (!reply || !reply.photo) return ctx.reply("Нужно ответить (reply) на сообщение с фото.");

// //   const photo = reply.photo[reply.photo.length - 1];
// //   const fileId = photo.file_id;

// //   const ok = await setProductPhotoInSheet(productId, fileId);
// //   if (!ok) return ctx.reply("Товар с таким id не найден в листе products.");

// //   return ctx.reply(`✅ Фото привязано к товару #${productId}\nfile_id сохранён в Google Sheets.`);
// // });

// // /* ===================== SHEET -> TG SYNC (POLL) ===================== */
// // /*
// //   "и наоборот тоже": если ты руками в таблице поменяла admin_status / prepayment,
// //   бот раз в 25 секунд подтянет изменения и обновит админ-карточку + (по правилам) уведомит клиента.
// // */
// // const lastSeen = new Map(); // orderId -> signature

// // async function pollOrdersAndRefresh() {
// //   try {
// //     const doc = await getDoc();
// //     const { ordersSheet } = await getSheets(doc);
// //     await ensureOrdersHeader(ordersSheet);

// //     const rows = await ordersSheet.getRows({ offset: 0, limit: 1500 });

// //     for (const row of rows) {
// //       const oid = normOrderId(row.get("order_id"));
// //       if (!oid) continue;

// //       const adminMsgId = Number(row.get("admin_msg_id") || 0);
// //       if (!adminMsgId) continue; // нечего обновлять в TG

// //       const admin_status = s(row.get("admin_status")) || "new";
// //       const computedClient = mapAdminToClient(admin_status);
// //       const existingClient = s(row.get("client_status")) || "";
// //       const prepayment = s(row.get("prepayment"));
// //       const status = s(row.get("status"));

// //       // если в таблице поменяли admin_status, но забыли client_status — выравниваем
// //       if (existingClient !== computedClient) {
// //         row.set("client_status", computedClient);
// //         row.set("status", admin_status);
// //         await row.save();
// //       }

// //       const sigAfter = [
// //         s(row.get("admin_status")),
// //         s(row.get("client_status")),
// //         s(row.get("prepayment")),
// //         s(row.get("status")),
// //       ].join("|");

// //       if (lastSeen.get(oid) === sigAfter) continue;

// //       // обновим админ карточку
// //       await refreshAdminCard(row);

// //       // уведомления клиенту — только по правилам
// //       const userId = s(row.get("user_id"));
// //       if (userId && shouldNotifyClient(existingClient, computedClient, admin_status)) {
// //         try {
// //           await bot.api.sendMessage(userId, `Обновление по заказу #${oid}: **${computedClient}**`, {
// //             parse_mode: "Markdown",
// //           });
// //         } catch (_) {}
// //       }

// //       lastSeen.set(oid, sigAfter);
// //     }
// //   } catch (e) {
// //     console.error("POLL ERROR:", e?.message || e);
// //   }
// // }

// // // каждые 25 секунд
// // setInterval(pollOrdersAndRefresh, 25_000);

// // /* ===================== ERRORS ===================== */
// // bot.catch((err) => console.error("BOT ERROR:", err));
// // bot.start();
// // console.log("Bot started");
// // index.js
// require("dotenv").config();
// const { Bot, InlineKeyboard, Keyboard, session } = require("grammy");
// const { GoogleSpreadsheet } = require("google-spreadsheet");
// const { JWT } = require("google-auth-library");

// /* ===================== ENV ===================== */
// const bot = new Bot(process.env.BOT_TOKEN);

// const ADMIN_ID = String(process.env.ADMIN_ID || "").trim();
// const SHEET_ID = String(process.env.SHEET_ID || "").trim();
// const PRODUCTS_SHEET = process.env.PRODUCTS_SHEET || "products";
// const ORDERS_SHEET = process.env.ORDERS_SHEET || "orders";

// /* ===================== SESSION ===================== */
// bot.use(
//   session({
//     initial: () => ({
//       prepayOrderId: null, // admin waiting for amount
//     }),
//   })
// );

// /* ===================== UTILS ===================== */
// const s = (x) => String(x ?? "").trim();
// const normHeader = (x) => String(x ?? "").trim().toLowerCase();

// function normalizePhone(input) {
//   const raw = String(input ?? "").trim();
//   return raw.replace(/\D/g, "");
// }

// function isValidPhoneDigits(digits) {
//   return /^\d{9,15}$/.test(String(digits || ""));
// }

// // чтобы находить order_id даже если sheets превратил в число/научную нотацию
// function normOrderId(v) {
//   const raw = String(v ?? "").trim();
//   if (!raw) return "";

//   if (raw.startsWith("'")) return raw.slice(1).replace(/\D/g, "");

//   if (/[eE]/.test(raw)) {
//     const n = Number(raw);
//     if (!Number.isNaN(n)) return String(Math.round(n));
//   }

//   return raw.replace(/\D/g, "");
// }

// function rub(n) {
//   const num = Number(String(n).replace(",", "."));
//   if (Number.isNaN(num)) return `${n} ₽`;
//   return `${num.toLocaleString("ru-RU")} ₽`;
// }

// function isAdmin(ctx) {
//   return String(ctx.from?.id || "") === ADMIN_ID;
// }

// function mainMenuKeyboard() {
//   return new Keyboard()
//     .text("🛍 Каталог")
//     .text("🧺 Корзина")
//     .row()
//     .text("📦 Мои заказы")
//     .text("🧩 Индивидуальный заказ")
//     .row()
//     .text("ℹ️ Поддержка")
//     .resized();
// }

// /* ===================== GOOGLE AUTH ===================== */
// function makeAuth() {
//   const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
//   return new JWT({
//     email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
//     key: privateKey,
//     scopes: ["https://www.googleapis.com/auth/spreadsheets"],
//   });
// }

// async function getDoc() {
//   if (!SHEET_ID) throw new Error("SHEET_ID missing in .env");
//   if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
//     throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL missing in .env");
//   if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("GOOGLE_PRIVATE_KEY missing in .env");

//   const doc = new GoogleSpreadsheet(SHEET_ID, makeAuth());
//   await doc.loadInfo();
//   return doc;
// }

// async function getSheets(doc) {
//   const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
//   const ordersSheet = doc.sheetsByTitle[ORDERS_SHEET];

//   if (!productsSheet) throw new Error(`Нет листа "${PRODUCTS_SHEET}"`);
//   if (!ordersSheet) throw new Error(`Нет листа "${ORDERS_SHEET}"`);

//   await productsSheet.loadHeaderRow();
//   await ordersSheet.loadHeaderRow();

//   return { productsSheet, ordersSheet };
// }

// function buildHeaderMap(sheet) {
//   const REQUIRED = sheet.headerValues || [];
//   const map = new Map();
//   for (const h of REQUIRED) map.set(normHeader(h), h);
//   return map;
// }

// /* ===================== PRODUCTS ===================== */
// function parseStock(raw) {
//   const v = s(raw).toLowerCase();
//   const n = Number(v);
//   if (v !== "" && !Number.isNaN(n)) return { mode: "qty", qty: n };
//   if (v === "in_stock") return { mode: "in_stock" };
//   if (v === "to_order") return { mode: "to_order" };
//   return { mode: "qty", qty: 0 };
// }

// function stockMark(stock) {
//   if (stock.mode === "to_order") return " (под заказ)";
//   if (stock.mode === "qty" && stock.qty <= 0) return " (нет)";
//   return "";
// }

// function stockLabel(stock) {
//   if (stock.mode === "qty") return `Остаток: **${stock.qty}**`;
//   if (stock.mode === "in_stock") return `Наличие: **в наличии**`;
//   if (stock.mode === "to_order") return `Наличие: **под заказ**`;
//   return `Наличие: **—**`;
// }

// // cache
// let PRODUCTS_CACHE = { ts: 0, data: [] };
// const CACHE_TTL_MS = 15_000;

// async function fetchActiveProducts() {
//   const now = Date.now();
//   if (now - PRODUCTS_CACHE.ts < CACHE_TTL_MS && PRODUCTS_CACHE.data.length) return PRODUCTS_CACHE.data;

//   const doc = await getDoc();
//   const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
//   if (!productsSheet) throw new Error(`Нет листа "${PRODUCTS_SHEET}"`);
//   await productsSheet.loadHeaderRow();

//   const headerMap = buildHeaderMap(productsSheet);

//   const get = (row, key, fallback = "") => {
//     const real = headerMap.get(normHeader(key));
//     if (!real) return fallback;
//     const val = row.get(real);
//     return val == null ? fallback : val;
//   };

//   const rows = await productsSheet.getRows();

//   const products = rows
//     .map((r) => {
//       const id = Number(get(r, "id", 0));
//       const title = s(get(r, "title", ""));
//       const price = Number(String(get(r, "price", "0")).replace(",", ".")) || 0;

//       const activeRaw = s(get(r, "active", "TRUE")).toUpperCase();
//       const active = activeRaw === "TRUE" || activeRaw === "1" || activeRaw === "YES";

//       return {
//         row: r,
//         id,
//         title,
//         price,
//         stock: parseStock(get(r, "stock", "")),
//         description: s(get(r, "description", "")),
//         brand: s(get(r, "brand", "")),
//         category: s(get(r, "category", "Без категории")) || "Без категории",
//         tg_file_id: s(get(r, "tg_file_id", "")),
//         active,
//       };
//     })
//     .filter((p) => p.active && Number.isFinite(p.id) && p.id > 0 && p.title);

//   PRODUCTS_CACHE = { ts: now, data: products };
//   return products;
// }

// async function setProductPhotoInSheet(productId, fileId) {
//   const doc = await getDoc();
//   const { productsSheet } = await getSheets(doc);

//   const rows = await productsSheet.getRows();
//   const row = rows.find((r) => Number(r.get("id")) === Number(productId));
//   if (!row) return false;

//   row.set("tg_file_id", fileId);
//   await row.save();

//   PRODUCTS_CACHE = { ts: 0, data: [] };
//   return true;
// }

// /* ===================== ORDERS (SHEETS) ===================== */
// const REQUIRED_ORDER_HEADERS = [
//   "order_id",
//   "created_at",
//   "customer",
//   "phone",
//   "address",
//   "comment",
//   "items",
//   "total",
//   "admin_status",
//   "client_status",
//   "prepayment",
//   "status",
//   "user_id",
//   "username",
//   "admin_msg_id",
// ];

// async function ensureOrdersHeader(ordersSheet) {
//   await ordersSheet.loadHeaderRow();
//   const existing = (ordersSheet.headerValues || []).map((h) => String(h || "").trim());
//   const missing = REQUIRED_ORDER_HEADERS.filter((h) => !existing.includes(h));
//   if (missing.length) {
//     throw new Error(
//       `В листе "${ORDERS_SHEET}" нет колонок: ${missing.join(", ")}. ` +
//         `Добавь их в шапку вручную (точно так же).`
//     );
//   }
// }

// async function appendOrderToSheet(order) {
//   const doc = await getDoc();
//   const { ordersSheet } = await getSheets(doc);

//   await ensureOrdersHeader(ordersSheet);

//   const headerMap = buildHeaderMap(ordersSheet);

//   const rowData = {};
//   for (const key of REQUIRED_ORDER_HEADERS) {
//     const real = headerMap.get(normHeader(key));
//     if (!real) continue;

//     if (key === "order_id") {
//       rowData[real] = `'${normOrderId(order.order_id)}`;
//     } else {
//       rowData[real] = order[key] ?? "";
//     }
//   }

//   await ordersSheet.addRow(rowData);
// }

// async function findOrderRowById(orderId) {
//   const doc = await getDoc();
//   const { ordersSheet } = await getSheets(doc);

//   await ensureOrdersHeader(ordersSheet);
//   const headerMap = buildHeaderMap(ordersSheet);
//   const realOrderIdHeader = headerMap.get("order_id") || "order_id";

//   const target = normOrderId(orderId);
//   if (!target) return { ordersSheet, row: null };

//   const PAGE = 500;
//   let offset = 0;

//   while (true) {
//     const rows = await ordersSheet.getRows({ offset, limit: PAGE });
//     if (!rows.length) break;

//     const found = rows.find((r) => normOrderId(r.get(realOrderIdHeader)) === target);
//     if (found) return { ordersSheet, row: found };

//     if (rows.length < PAGE) break;
//     offset += PAGE;
//   }

//   return { ordersSheet, row: null };
// }

// async function updateOrderRow(orderId, patch) {
//   const { row } = await findOrderRowById(orderId);
//   if (!row) return null;

//   for (const [k, v] of Object.entries(patch)) row.set(k, v);
//   await row.save();
//   return row;
// }

// async function getUserOrdersFromSheet(userId) {
//   const doc = await getDoc();
//   const { ordersSheet } = await getSheets(doc);

//   await ensureOrdersHeader(ordersSheet);

//   const rows = await ordersSheet.getRows({ offset: 0, limit: 5000 });

//   return rows
//     .filter((r) => String(r.get("user_id") ?? "") === String(userId))
//     .sort((a, b) => Number(normOrderId(b.get("order_id"))) - Number(normOrderId(a.get("order_id"))));
// }

// async function getLastUserInfo(userId) {
//   const rows = await getUserOrdersFromSheet(userId);
//   if (!rows.length) return null;
//   const o = rows[0];
//   return {
//     customer: s(o.get("customer")),
//     phone: s(o.get("phone")),
//     address: s(o.get("address")),
//   };
// }

// /* ===================== STATUSES ===================== */
// const ADMIN_STATUSES = [
//   { key: "new", label: "🆕 Новый" },
//   { key: "contacted", label: "☎️ Связался" },
//   { key: "prepaid", label: "💳 Предоплата внесена" },
//   { key: "ordered", label: "📦 Заказано" },
//   { key: "supplier", label: "🏭 Прибыл на склад поставщика" },
//   { key: "tk", label: "🚚 Прибыл на склад ТК" },
//   { key: "fromChina", label: "✈️ Отправлено из Китая" },
//   { key: "kz", label: "🇰🇿 Прибыл в КЗ" },
//   { key: "moscow", label: "🏙 Прибыло в Москву" },
//   { key: "delivered", label: "✅ Вручен" },
// ];

// function mapAdminToClient(adminStatus) {
//   const st = s(adminStatus).toLowerCase();

//   if (st === "delivered") return "получен";
//   if (st === "supplier") return "прибыло на склад китай";
//   if (st === "fromchina") return "отправлено из китая";
//   if (st === "moscow") return "прибыло в москву";
//   if (st === "contacted" || st === "prepaid") return "подтвержден";

//   return "оформлен";
// }

// // клиенту шлём только выбранные статусы (если статус реально поменялся)
// function shouldNotifyClient(prevClientStatus, nextClientStatus) {
//   const prev = s(prevClientStatus).toLowerCase();
//   const next = s(nextClientStatus).toLowerCase();

//   const ALLOWED = new Set([
//     "подтвержден",
//     "прибыло на склад китай",
//     "отправлено из китая",
//     "прибыло в москву",
//     "получен",
//   ]);

//   return ALLOWED.has(next) && next !== prev;
// }

// /* ===================== KEYBOARDS ===================== */
// function adminOrderKeyboard(orderId) {
//   const oid = normOrderId(orderId);
//   const kb = new InlineKeyboard();

//   for (const st of ADMIN_STATUSES) kb.text(st.label, `ast:${st.key}:${oid}`).row();

//   kb.text("💰 Ввести предоплату", `aprepay:${oid}`).row();
//   return kb;
// }

// /* ===================== ADMIN CARD ===================== */
// async function buildAdminCardText(row) {
//   const oid = normOrderId(row.get("order_id"));
//   const prepay = s(row.get("prepayment"));
//   const adminStatus = s(row.get("admin_status")) || "new";
//   const clientStatus = s(row.get("client_status")) || mapAdminToClient(adminStatus);

//   return (
//     `📦 ЗАКАЗ #${oid}\n` +
//     `От: ${s(row.get("username")) || "-"} (id:${s(row.get("user_id"))})\n` +
//     `Имя: ${s(row.get("customer"))}\n` +
//     `Тел: ${s(row.get("phone"))}\n` +
//     `Адрес: ${s(row.get("address"))}\n` +
//     `Комментарий: ${s(row.get("comment")) || "-"}\n\n` +
//     `${s(row.get("items"))}\n\n` +
//     `Итого: ${rub(row.get("total"))}\n` +
//     `Admin: ${adminStatus}\n` +
//     `Client: ${clientStatus}\n` +
//     `Предоплата: ${prepay ? rub(prepay) : "-"}`
//   );
// }

// async function refreshAdminCard(row) {
//   const msgId = Number(row.get("admin_msg_id") || 0);
//   if (!msgId) return;

//   const text = await buildAdminCardText(row);

//   try {
//     await bot.api.editMessageText(ADMIN_ID, msgId, text, {
//       reply_markup: adminOrderKeyboard(normOrderId(row.get("order_id"))),
//     });
//   } catch (e) {
//     const msg = String(e?.message || "");
//     if (msg.includes("message is not modified")) return;
//     throw e;
//   }
// }

// async function sendAdminCard(orderId) {
//   if (!ADMIN_ID) return null;

//   const { row } = await findOrderRowById(orderId);
//   if (!row) return null;

//   const text = await buildAdminCardText(row);

//   try {
//     const msg = await bot.api.sendMessage(ADMIN_ID, text, {
//       reply_markup: adminOrderKeyboard(normOrderId(orderId)),
//     });
//     return msg.message_id;
//   } catch (e) {
//     console.error("ADMIN SEND ERROR:", e?.message || e);
//     return null;
//   }
// }

// /* ===================== CART ===================== */
// const carts = new Map(); // userId -> Map(productId -> qty)
// function getCart(userId) {
//   if (!carts.has(userId)) carts.set(userId, new Map());
//   return carts.get(userId);
// }

// /* ===================== CATALOG UI ===================== */
// async function showCategories(ctx) {
//   const products = await fetchActiveProducts();
//   const categories = [...new Set(products.map((p) => p.category))]
//     .filter(Boolean)
//     .sort((a, b) => a.localeCompare(b, "ru"));

//   if (!categories.length) {
//     return ctx.reply("Каталог пуст.", { reply_markup: mainMenuKeyboard() });
//   }

//   const kb = new InlineKeyboard();
//   for (const c of categories) kb.text(c, `cat:${c}`).row();

//   return ctx.reply("🗂 Выбери категорию:", { reply_markup: kb });
// }

// async function showProductsByCategory(ctx, category) {
//   const products = await fetchActiveProducts();
//   const filtered = products.filter((p) => p.category === category);

//   const kb = new InlineKeyboard().text("⬅️ Категории", "cats").row();
//   for (const p of filtered) kb.text(`${p.title}${stockMark(p.stock)}`, `p:${p.id}`).row();

//   return ctx.editMessageText(`🛍 Категория: **${category}**`, {
//     parse_mode: "Markdown",
//     reply_markup: kb,
//   });
// }

// async function showProductCard(ctx, productId) {
//   const products = await fetchActiveProducts();
//   const p = products.find((x) => x.id === Number(productId));
//   if (!p) return ctx.answerCallbackQuery({ text: "Товар не найден" });

//   const caption =
//     `**${p.title}**\n` +
//     `${p.brand ? `Бренд: ${p.brand}\n` : ""}` +
//     `${p.description || ""}\n\n` +
//     `Цена: **${rub(p.price)}**\n` +
//     `${stockLabel(p.stock)}`;

//   const kb = new InlineKeyboard()
//     .text("➕ В корзину", `add:${p.id}`)
//     .row()
//     .text("⬅️ Назад", `cat:${p.category}`);

//   await ctx.answerCallbackQuery();

//   if (p.tg_file_id) {
//     return ctx.replyWithPhoto(p.tg_file_id, { caption, parse_mode: "Markdown", reply_markup: kb });
//   }

//   return ctx.editMessageText(caption, { parse_mode: "Markdown", reply_markup: kb });
// }

// /* ===================== CART UI ===================== */
// async function showCart(ctx) {
//   const userId = ctx.from.id;
//   const cart = getCart(userId);

//   if (cart.size === 0) {
//     return ctx.reply("Корзина пуста 🧺", {
//       reply_markup: new InlineKeyboard().text("🛍 В каталог", "cats"),
//     });
//   }

//   const products = await fetchActiveProducts();
//   const items = [];

//   for (const [pid, qty] of cart.entries()) {
//     const p = products.find((x) => x.id === Number(pid));
//     if (p) items.push({ ...p, qty });
//   }

//   const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

//   const lines = items.map(
//     (it, i) => `${i + 1}) ${it.title}\n   ${it.qty} × ${rub(it.price)} = ${rub(it.price * it.qty)}`
//   );

//   const kb = new InlineKeyboard()
//     .text("✅ Оформить", "checkout")
//     .row()
//     .text("🧹 Очистить", "cart_clear")
//     .row()
//     .text("🛍 В каталог", "cats");

//   return ctx.reply(`🧺 **Корзина**\n\n${lines.join("\n\n")}\n\nИтого: **${rub(total)}**`, {
//     parse_mode: "Markdown",
//     reply_markup: kb,
//   });
// }

// /* ===================== CHECKOUT FLOW ===================== */
// const checkoutState = new Map(); // userId -> { step, data }
// const customOrderState = new Map(); // userId -> { step, data }

// bot.callbackQuery("checkout", async (ctx) => {
//   const userId = ctx.from.id;
//   const cart = getCart(userId);

//   if (!cart.size) {
//     await ctx.answerCallbackQuery({ text: "Корзина пуста" });
//     return;
//   }

//   await ctx.answerCallbackQuery();

//   const last = await getLastUserInfo(userId);

//   checkoutState.set(userId, {
//     step: "name",
//     data: {
//       name: last?.customer || "",
//       phone: last?.phone || "",
//       address: last?.address || "",
//       comment: "",
//     },
//   });

//   const hint = last
//     ? `\n\nМожно отправить **+** или **=** чтобы использовать прошлые данные:\nИмя: ${last.customer || "-"}\nТел: ${last.phone || "-"}\nАдрес: ${last.address || "-"}`
//     : "";

//   return ctx.reply("Оформление заказа ✅\n\nВведи **имя** получателя:" + hint, {
//     parse_mode: "Markdown",
//   });
// });

// bot.hears("🧩 Индивидуальный заказ", async (ctx) => {
//   const userId = ctx.from.id;
//   const last = await getLastUserInfo(userId);

//   customOrderState.set(userId, {
//     step: "name",
//     data: {
//       name: last?.customer || "",
//       phone: last?.phone || "",
//       vin: "",
//       oem: "",
//       list: "",
//     },
//   });

//   const hint = last
//     ? `\n\nМожно отправить **+** или **=** чтобы использовать прошлые данные:\nИмя: ${last.customer || "-"}\nТел: ${last.phone || "-"}`
//     : "";

//   return ctx.reply("🧩 Индивидуальный заказ\n\nВведи **имя** получателя:" + hint, {
//     parse_mode: "Markdown",
//     reply_markup: mainMenuKeyboard(),
//   });
// });

// /* ===================== MAIN TEXT HANDLER ===================== */
// bot.on("message:text", async (ctx, next) => {
//   /* ===== ADMIN: waiting prepay amount ===== */
//   if (isAdmin(ctx) && ctx.session.prepayOrderId) {
//     const oid = ctx.session.prepayOrderId;
//     const amount = Number(ctx.message.text.replace(/[^\d.,]/g, "").replace(",", "."));
//     if (!amount || amount <= 0) return ctx.reply("Введи сумму числом (например 5000)");

//     ctx.session.prepayOrderId = null;

//     const { row: before } = await findOrderRowById(oid);
//     if (!before) return ctx.reply("Заказ не найден в таблице.");
//     const prevClient = s(before.get("client_status"));

//     const admin_status = "prepaid";
//     const client_status = mapAdminToClient(admin_status);

//     const row = await updateOrderRow(oid, {
//       prepayment: amount,
//       admin_status,
//       client_status,
//       status: admin_status,
//     });

//     if (!row) return ctx.reply("Заказ не найден в таблице.");

//     await refreshAdminCard(row);

//     const userId = s(row.get("user_id"));
//     if (userId && shouldNotifyClient(prevClient, client_status)) {
//       try {
//         await bot.api.sendMessage(
//           userId,
//           `Обновление по заказу #${normOrderId(row.get("order_id"))}: **${client_status}**`,
//           { parse_mode: "Markdown" }
//         );
//       } catch (_) {}
//     }

//     return ctx.reply(`✅ Предоплата сохранена: ${rub(amount)}`);
//   }

//   /* ===== CUSTOM ORDER: steps ===== */
//   const cu = customOrderState.get(ctx.from.id);
//   if (cu) {
//     const text = (ctx.message.text || "").trim();
//     const shortcut = text === "+" || text === "=";

//     if (shortcut) {
//       const hasPrefill =
//         (cu.data?.name && cu.data.name.trim()) || (cu.data?.phone && cu.data.phone.trim());
//       if (!hasPrefill) {
//         cu.step = "name";
//         return ctx.reply("Прошлых данных нет. Введи **имя**:", { parse_mode: "Markdown" });
//       }
//       cu.step = "vin";
//       return ctx.reply("Введи **VIN-код**:", { parse_mode: "Markdown" });
//     }

//     if (cu.step === "name") {
//       cu.data.name = text;
//       cu.step = "phone";
//       return ctx.reply("Телефон (можно с +, пробелами — я очищу):", { parse_mode: "Markdown" });
//     }

//     if (cu.step === "phone") {
//       const digits = normalizePhone(text);
//       if (!isValidPhoneDigits(digits)) {
//         return ctx.reply(
//           "❌ Номер телефона некорректный.\n\n" +
//             "Введи номер (9–15 цифр). Можно так:\n" +
//             "• 79991234567\n" +
//             "• +7 999 123-45-67\n" +
//             "• +995 555 12 34 56",
//           { parse_mode: "Markdown" }
//         );
//       }
//       cu.data.phone = digits;
//       cu.step = "vin";
//       return ctx.reply("Введи **VIN-код**:", { parse_mode: "Markdown" });
//     }

//     if (cu.step === "vin") {
//       cu.data.vin = text;
//       cu.step = "oem";
//       return ctx.reply("Введи **OEM-код** (если несколько — через запятую), если нет информации, отправьте Нет:", {
//         parse_mode: "Markdown",
//       });
//     }

//     if (cu.step === "oem") {
//       cu.data.oem = text;
//       cu.step = "list";
//       return ctx.reply("Перечень точно, что нужно (можно списком):", { parse_mode: "Markdown" });
//     }

//     if (cu.step === "list") {
//       cu.data.list = text;

//       const createdAt = new Date().toISOString();
//       const orderId = String(Date.now());

//       const itemsText =
//         `🧩 Индивидуальный заказ\n` +
//         `VIN: ${cu.data.vin || "-"}\n` +
//         `OEM: ${cu.data.oem || "-"}\n` +
//         `Запрос:\n${cu.data.list || "-"}`;

//       customOrderState.delete(ctx.from.id);

//       const admin_status = "new";
//       const client_status = mapAdminToClient(admin_status);

//       await ctx.reply(
//         `Заявка **#${orderId}** отправлена ✅\nСтатус: **${client_status}**\n\nМы свяжемся с тобой.`,
//         { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() }
//       );

//       try {
//         await appendOrderToSheet({
//           order_id: orderId,
//           created_at: createdAt,
//           customer: cu.data.name,
//           phone: cu.data.phone,
//           address: "",
//           comment: "",
//           items: itemsText,
//           total: "",
//           admin_status,
//           client_status,
//           prepayment: "",
//           status: admin_status,
//           user_id: String(ctx.from.id),
//           username: ctx.from.username ? `@${ctx.from.username}` : "",
//           admin_msg_id: "",
//         });

//         const adminMsgId = await sendAdminCard(orderId);
//         if (adminMsgId) await updateOrderRow(orderId, { admin_msg_id: String(adminMsgId) });
//       } catch (e) {
//         console.error("CUSTOM ORDER ERROR:", e?.message || e);
//         try {
//           await bot.api.sendMessage(
//             ADMIN_ID,
//             `⚠️ Ошибка при индивидуальном заказе #${orderId}\n${String(e?.message || e)}`
//           );
//         } catch (_) {}
//       }

//       return;
//     }

//     return;
//   }

//   /* ===== CHECKOUT: steps ===== */
//   const userId = ctx.from.id;
//   const state = checkoutState.get(userId);
//   if (!state) return next();

//   const text = (ctx.message.text || "").trim();
//   const shortcut = text === "+" || text === "=";

//   if (shortcut) {
//     const hasPrefill =
//       (state.data?.name && state.data.name.trim()) ||
//       (state.data?.phone && state.data.phone.trim()) ||
//       (state.data?.address && state.data.address.trim());

//     if (!hasPrefill) {
//       state.step = "name";
//       return ctx.reply("Прошлых данных нет. Введи **имя** получателя:", { parse_mode: "Markdown" });
//     }

//     state.step = "comment";
//     return ctx.reply("Комментарий? (если нет — напиши `-`)", { parse_mode: "Markdown" });
//   }

//   if (state.step === "name") {
//     state.data.name = text;
//     state.step = "phone";
//     return ctx.reply("Телефон получателя:", { parse_mode: "Markdown" });
//   }

//   if (state.step === "phone") {
//     const digits = normalizePhone(text);

//     if (!isValidPhoneDigits(digits)) {
//       return ctx.reply(
//         "❌ Номер телефона некорректный.\n\n" +
//           "Введи номер (9–15 цифр). Можно так:\n" +
//           "• 79991234567\n" +
//           "• +7 999 123-45-67\n" +
//           "• +995 555 12 34 56",
//         { parse_mode: "Markdown" }
//       );
//     }

//     state.data.phone = digits;
//     state.step = "address";
//     return ctx.reply("Адрес доставки:", { parse_mode: "Markdown" });
//   }

//   if (state.step === "address") {
//     state.data.address = text;
//     state.step = "comment";
//     return ctx.reply("Комментарий? (если нет — напиши `-`)", { parse_mode: "Markdown" });
//   }

//   if (state.step === "comment") {
//     state.data.comment = text === "-" ? "" : text;

//     const cart = getCart(userId);
//     const products = await fetchActiveProducts();

//     const items = [];
//     for (const [pid, qty] of cart.entries()) {
//       const p = products.find((x) => x.id === Number(pid));
//       if (!p) continue;

//       if (p.stock.mode === "qty" && p.stock.qty < qty) {
//         checkoutState.delete(userId);
//         return ctx.reply(`Недостаточно остатка для "${p.title}". Проверь корзину.`);
//       }
//       if (p.stock.mode === "qty" && p.stock.qty <= 0) {
//         checkoutState.delete(userId);
//         return ctx.reply(`Товар "${p.title}" сейчас недоступен.`);
//       }

//       items.push({ title: p.title, price: p.price, qty, stockMode: p.stock.mode });
//     }

//     if (!items.length) {
//       checkoutState.delete(userId);
//       return ctx.reply("Корзина пуста.");
//     }

//     const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
//     const createdAt = new Date().toISOString();
//     const orderId = String(Date.now());

//     const itemsText = items
//       .map((it, i) => {
//         const extra = it.stockMode === "to_order" ? " (под заказ)" : "";
//         return `${i + 1}) ${it.title}${extra} — ${it.qty} × ${rub(it.price)}`;
//       })
//       .join("\n");

//     cart.clear();
//     checkoutState.delete(userId);

//     const admin_status = "new";
//     const client_status = mapAdminToClient(admin_status);

//     await ctx.reply(
//       `Заказ **#${orderId}** оформлен ✅\nИтого: **${rub(total)}**\nСтатус: **${client_status}**`,
//       { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() }
//     );

//     try {
//       await appendOrderToSheet({
//         order_id: orderId,
//         created_at: createdAt,
//         customer: state.data.name,
//         phone: state.data.phone,
//         address: state.data.address,
//         comment: state.data.comment || "",
//         items: itemsText,
//         total: total,
//         admin_status,
//         client_status,
//         prepayment: "",
//         status: admin_status,
//         user_id: String(userId),
//         username: ctx.from.username ? `@${ctx.from.username}` : "",
//         admin_msg_id: "",
//       });

//       const adminMsgId = await sendAdminCard(orderId);
//       if (adminMsgId) await updateOrderRow(orderId, { admin_msg_id: String(adminMsgId) });
//     } catch (e) {
//       console.error("CHECKOUT ERROR:", e?.message || e);
//       try {
//         await bot.api.sendMessage(
//           ADMIN_ID,
//           `⚠️ Ошибка при оформлении заказа #${orderId}\n${String(e?.message || e)}`
//         );
//       } catch (_) {}
//     }

//     return;
//   }

//   return next();
// });

// /* ===================== ADMIN BUTTONS ===================== */
// bot.callbackQuery(/^ast:([^:]+):(\d+)$/, async (ctx) => {
//   if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "Нет доступа" });

//   const admin_status = ctx.match[1];
//   const orderId = ctx.match[2];

//   const { row: beforeRow } = await findOrderRowById(orderId);
//   if (!beforeRow) {
//     await ctx.answerCallbackQuery({ text: "Заказ не найден в таблице" });
//     return;
//   }

//   const prevClientStatus = s(beforeRow.get("client_status"));
//   const client_status = mapAdminToClient(admin_status);

//   const row = await updateOrderRow(orderId, {
//     admin_status,
//     client_status,
//     status: admin_status,
//   });

//   if (!row) {
//     await ctx.answerCallbackQuery({ text: "Заказ не найден в таблице" });
//     return;
//   }

//   await refreshAdminCard(row);
//   await ctx.answerCallbackQuery({ text: "Обновлено ✅" });

//   const userId = s(row.get("user_id"));
//   if (userId && shouldNotifyClient(prevClientStatus, client_status)) {
//     try {
//       await bot.api.sendMessage(
//         userId,
//         `Обновление по заказу #${normOrderId(row.get("order_id"))}: **${client_status}**`,
//         { parse_mode: "Markdown" }
//       );
//     } catch (_) {}
//   }
// });

// bot.callbackQuery(/^aprepay:(\d+)$/, async (ctx) => {
//   if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: "Нет доступа" });

//   const orderId = ctx.match[1];
//   const { row } = await findOrderRowById(orderId);

//   if (!row) {
//     await ctx.answerCallbackQuery({ text: "Заказ не найден" });
//     return;
//   }

//   ctx.session.prepayOrderId = normOrderId(orderId);
//   await ctx.answerCallbackQuery();
//   return ctx.reply(`💳 Введи сумму предоплаты для заказа #${orderId} (просто число):`);
// });

// /* ===================== MENU ===================== */
// bot.command("start", async (ctx) => {
//   await ctx.reply("Привет! Это магазин-бот 🛒", { reply_markup: mainMenuKeyboard() });
// });

// bot.command("id", (ctx) => ctx.reply(`Твой Telegram ID: ${ctx.from.id}`));

// bot.hears("🛍 Каталог", async (ctx) => showCategories(ctx));
// bot.hears("🧺 Корзина", async (ctx) => showCart(ctx));

// bot.hears("📦 Мои заказы", async (ctx) => {
//   const orders = await getUserOrdersFromSheet(ctx.from.id);
//   if (!orders.length) return ctx.reply("Заказов пока нет 📦");

//   const lines = orders.slice(0, 30).map((o) => {
//     const oid = normOrderId(o.get("order_id"));
//     const st = s(o.get("client_status")) || "оформлен";
//     const total = o.get("total");
//     const date = s(o.get("created_at")).slice(0, 10);
//     return `#${oid} • ${st} • ${rub(total)} • ${date}`;
//   });

//   return ctx.reply(`📦 Мои заказы:\n\n${lines.join("\n")}`);
// });

// bot.hears("ℹ️ Поддержка", (ctx) => ctx.reply("Напиши сюда, и мы ответим."));

// bot.callbackQuery("cats", async (ctx) => {
//   await ctx.answerCallbackQuery();
//   return showCategories(ctx);
// });

// bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
//   const category = ctx.match[1];
//   await ctx.answerCallbackQuery();
//   return showProductsByCategory(ctx, category);
// });

// bot.callbackQuery(/^p:(\d+)$/, async (ctx) => {
//   const id = Number(ctx.match[1]);
//   return showProductCard(ctx, id);
// });

// bot.callbackQuery(/^add:(\d+)$/, async (ctx) => {
//   const productId = Number(ctx.match[1]);
//   const userId = ctx.from.id;

//   const products = await fetchActiveProducts();
//   const p = products.find((x) => x.id === productId);
//   if (!p) return ctx.answerCallbackQuery({ text: "Товар не найден" });

//   if (p.stock.mode === "qty" && p.stock.qty <= 0) {
//     return ctx.answerCallbackQuery({ text: "Нет в наличии" });
//   }

//   const cart = getCart(userId);
//   const current = cart.get(productId) || 0;
//   const nextQty = current + 1;

//   if (p.stock.mode === "qty" && nextQty > p.stock.qty) {
//     return ctx.answerCallbackQuery({ text: "Недостаточно на складе" });
//   }

//   cart.set(productId, nextQty);
//   const msg = p.stock.mode === "to_order" ? "Добавлено ✅ (под заказ)" : "Добавлено ✅";
//   return ctx.answerCallbackQuery({ text: msg });
// });

// bot.callbackQuery("cart_clear", async (ctx) => {
//   getCart(ctx.from.id).clear();
//   await ctx.answerCallbackQuery({ text: "Очищено" });
//   return showCart(ctx);
// });

// /* ===================== ADMIN: SET PHOTO ===================== */
// // usage: send photo -> reply /set_photo 12
// bot.command("set_photo", async (ctx) => {
//   if (!isAdmin(ctx)) return;

//   const productId = Number(ctx.message.text.split(" ")[1]);
//   if (!productId) return ctx.reply("Формат: ответь на фото командой\n/set_photo 12");

//   const reply = ctx.message.reply_to_message;
//   if (!reply || !reply.photo) return ctx.reply("Нужно ответить (reply) на сообщение с фото.");

//   const photo = reply.photo[reply.photo.length - 1];
//   const fileId = photo.file_id;

//   const ok = await setProductPhotoInSheet(productId, fileId);
//   if (!ok) return ctx.reply("Товар с таким id не найден в листе products.");

//   return ctx.reply(`✅ Фото привязано к товару #${productId}\nfile_id сохранён в Google Sheets.`);
// });

// /* ===================== SHEET -> TG SYNC (POLL) ===================== */
// const lastSeen = new Map(); // orderId -> signature

// async function pollOrdersAndRefresh() {
//   try {
//     const doc = await getDoc();
//     const { ordersSheet } = await getSheets(doc);
//     await ensureOrdersHeader(ordersSheet);

//     const rows = await ordersSheet.getRows({ offset: 0, limit: 1500 });

//     for (const row of rows) {
//       const oid = normOrderId(row.get("order_id"));
//       if (!oid) continue;

//       const adminMsgId = Number(row.get("admin_msg_id") || 0);
//       if (!adminMsgId) continue;

//       const admin_status = s(row.get("admin_status")) || "new";
//       const computedClient = mapAdminToClient(admin_status);
//       const existingClient = s(row.get("client_status")) || "";

//       // выравниваем, если руками поменяли admin_status, но не client_status
//       if (existingClient !== computedClient) {
//         row.set("client_status", computedClient);
//         row.set("status", admin_status);
//         await row.save();
//       }

//       const sigAfter = [
//         s(row.get("admin_status")),
//         s(row.get("client_status")),
//         s(row.get("prepayment")),
//         s(row.get("status")),
//       ].join("|");

//       if (lastSeen.get(oid) === sigAfter) continue;

//       await refreshAdminCard(row);

//       const userId = s(row.get("user_id"));
//       if (userId && shouldNotifyClient(existingClient, computedClient)) {
//         try {
//           await bot.api.sendMessage(userId, `Обновление по заказу #${oid}: **${computedClient}**`, {
//             parse_mode: "Markdown",
//           });
//         } catch (_) {}
//       }

//       lastSeen.set(oid, sigAfter);
//     }
//   } catch (e) {
//     console.error("POLL ERROR:", e?.message || e);
//   }
// }

// setInterval(pollOrdersAndRefresh, 25_000);

// /* ===================== ERRORS ===================== */
// bot.catch((err) => console.error("BOT ERROR:", err));
// bot.start();
// console.log("Bot started");
// require("dotenv").config();
// const { Bot, InlineKeyboard, Keyboard, session } = require("grammy");
// const { GoogleSpreadsheet } = require("google-spreadsheet");
// const { JWT } = require("google-auth-library");

// /* ===================== CONFIG ===================== */
// const bot = new Bot(process.env.BOT_TOKEN);
// const ADMIN_ID = String(process.env.ADMIN_ID || "").trim();
// const SHEET_ID = String(process.env.SHEET_ID || "").trim();
// const PRODUCTS_SHEET = process.env.PRODUCTS_SHEET || "products";
// const ORDERS_SHEET = process.env.ORDERS_SHEET || "orders";

// bot.use(session({ initial: () => ({ prepayOrderId: null }) }));

// /* ===================== UTILS ===================== */
// const s = (x) => String(x ?? "").trim();
// const normalizePhone = (input) => String(input ?? "").replace(/\D/g, "");
// const isValidPhoneDigits = (digits) => /^\d{9,15}$/.test(digits);
// const rub = (n) => {
//     const num = Number(String(n).replace(",", "."));
//     return Number.isNaN(num) ? `${n} ₽` : `${num.toLocaleString("ru-RU")} ₽`;
// };
// const isAdmin = (ctx) => String(ctx.from?.id || "") === ADMIN_ID;

// // Статусы для админа
// const ADMIN_STATUSES = [
//     { key: "new", label: "🆕 Новый" },
//     { key: "contacted", label: "☎️ Связался" },
//     { key: "prepaid", label: "💳 Предоплата" },
//     { key: "ordered", label: "📦 Заказано" },
//     { key: "supplier", label: "🏭 Склад Китай" },
//     { key: "tk", label: "🚚 Склад ТК" },
//     { key: "fromChina", label: "✈️ Из Китая" },
//     { key: "kz", label: "🇰🇿 В КЗ" },
//     { key: "moscow", label: "🏙 В Москве" },
//     { key: "delivered", label: "✅ Вручен" },
// ];

// function mainMenuKeyboard() {
//     return new Keyboard()
//         .text("🧩 Индивидуальный заказ").text("🛍 Каталог")
//         .row()
//         .text("📦 Мои заказы").text("🧺 Корзина")
//         .row()
//         .text("ℹ️ Поддержка")
//         .resized();
// }

// /* ===================== GOOGLE AUTH ===================== */
// function makeAuth() {
//     const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
//     return new JWT({
//         email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
//         key: privateKey,
//         scopes: ["https://www.googleapis.com/auth/spreadsheets"],
//     });
// }

// async function getDoc() {
//     const doc = new GoogleSpreadsheet(SHEET_ID, makeAuth());
//     await doc.loadInfo();
//     return doc;
// }

// async function getSheets(doc) {
//     const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
//     const ordersSheet = doc.sheetsByTitle[ORDERS_SHEET];
//     await productsSheet.loadHeaderRow();
//     await ordersSheet.loadHeaderRow();
//     return { productsSheet, ordersSheet };
// }

// /* ===================== DATA & STATE ===================== */
// const carts = new Map(); 
// const flowState = new Map(); 

// function getCart(userId) {
//     if (!carts.has(userId)) carts.set(userId, []);
//     return carts.get(userId);
// }

// async function getLastUserInfo(userId) {
//     try {
//         const doc = await getDoc();
//         const { ordersSheet } = await getSheets(doc);
//         const rows = await ordersSheet.getRows();
//         const userRows = rows.filter(r => String(r.get("user_id")) === String(userId)).reverse();
//         if (!userRows.length) return null;
//         const last = userRows[0];
//         let vin = "";
//         const comm = s(last.get("comment"));
//         if (comm.includes("VIN:")) vin = comm.split("VIN:")[1].split("\n")[0].trim();
//         return { 
//             name: s(last.get("customer")), 
//             phone: s(last.get("phone")), 
//             address: s(last.get("address")), 
//             vin: vin 
//         };
//     } catch (e) { return null; }
// }

// /* ===================== ADMIN ACTIONS ===================== */
// function adminOrderKeyboard(orderId) {
//     const kb = new InlineKeyboard();
//     ADMIN_STATUSES.forEach((st, idx) => {
//         kb.text(st.label, `ast:${st.key}:${orderId}`);
//         if (idx % 2 !== 0) kb.row();
//     });
//     kb.row().text("💰 Ввести предоплату", `aprepay:${orderId}`);
//     return kb;
// }

// async function sendAdminCard(orderId) {
//     if (!ADMIN_ID) return;
//     const doc = await getDoc();
//     const { ordersSheet } = await getSheets(doc);
//     const rows = await ordersSheet.getRows();
//     const row = rows.find(r => s(r.get("order_id")).includes(orderId));
//     if (!row) return;

//     const text = `📦 ЗАКАЗ #${orderId}\n` +
//                  `Клиент: ${row.get("customer")}\n` +
//                  `Тел: ${row.get("phone")}\n` +
//                  `Адрес: ${row.get("address")}\n` +
//                  `Комментарий: ${row.get("comment")}\n\n` +
//                  `Состав:\n${row.get("items")}\n\n` +
//                  `Итого: ${row.get("total")}\n` +
//                  `Статус: ${row.get("admin_status")}\n` +
//                  `Предоплата: ${row.get("prepayment") || "0"} ₽`;
    
//     const msg = await bot.api.sendMessage(ADMIN_ID, text, { reply_markup: adminOrderKeyboard(orderId) });
//     row.set("admin_msg_id", String(msg.message_id));
//     await row.save();
// }

// /* ===================== HANDLERS ===================== */

// bot.command("start", (ctx) => ctx.reply("Приветствуем в магазине автозапчастей!", { reply_markup: mainMenuKeyboard() }));

// // --- КАТАЛОГ С КНОПКАМИ НАЗАД ---
// bot.hears("🛍 Каталог", async (ctx) => {
//     const doc = await getDoc();
//     const { productsSheet } = await getSheets(doc);
//     const rows = await productsSheet.getRows();
//     const cats = [...new Set(rows.map(r => r.get("category")).filter(Boolean))];
//     const kb = new InlineKeyboard();
//     cats.forEach(c => kb.text(c, `cat:${c}`).row());
//     ctx.reply("🗂 Выберите категорию:", { reply_markup: kb });
// });

// bot.callbackQuery("cats", async (ctx) => {
//     const doc = await getDoc();
//     const { productsSheet } = await getSheets(doc);
//     const rows = await productsSheet.getRows();
//     const cats = [...new Set(rows.map(r => r.get("category")).filter(Boolean))];
//     const kb = new InlineKeyboard();
//     cats.forEach(c => kb.text(c, `cat:${c}`).row());
//     await ctx.editMessageText("🗂 Выберите категорию:", { reply_markup: kb });
// });

// bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
//     const cat = ctx.match[1];
//     const doc = await getDoc();
//     const { productsSheet } = await getSheets(doc);
//     const rows = await productsSheet.getRows();
//     const kb = new InlineKeyboard();
//     rows.filter(r => r.get("category") === cat && s(r.get("active")).toUpperCase() === "TRUE").forEach(r => {
//         kb.text(`${r.get("title")} - ${rub(r.get("price"))}`, `view_p:${r.get("id")}:${cat}`).row();
//     });
//     kb.text("⬅️ Назад в категории", "cats");
//     await ctx.editMessageText(`📦 Товары в категории ${cat}:`, { reply_markup: kb });
// });

// bot.callbackQuery(/^view_p:(\d+):(.+)$/, async (ctx) => {
//     const [_, pid, cat] = ctx.match;
//     const doc = await getDoc();
//     const { productsSheet } = await getSheets(doc);
//     const rows = await productsSheet.getRows();
//     const p = rows.find(r => r.get("id") === pid);
//     if (!p) return ctx.answerCallbackQuery("Товар не найден");

//     const text = `**${p.get("title")}**\n\n${p.get("description") || ""}\n\nЦена: ${rub(p.get("price"))}`;
//     const kb = new InlineKeyboard()
//         .text("➕ В корзину", `add_p:${pid}`)
//         .row()
//         .text("⬅️ Назад к товарам", `cat:${cat}`);

//     if (p.get("tg_file_id")) {
//         await ctx.replyWithPhoto(p.get("tg_file_id"), { caption: text, parse_mode: "Markdown", reply_markup: kb });
//     } else {
//         await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
//     }
// });

// bot.callbackQuery(/^add_p:(\d+)$/, async (ctx) => {
//     const pid = ctx.match[1];
//     const doc = await getDoc();
//     const { productsSheet } = await getSheets(doc);
//     const rows = await productsSheet.getRows();
//     const p = rows.find(r => r.get("id") === pid);
//     if (p) {
//         getCart(ctx.from.id).push({ title: p.get("title"), price: Number(p.get("price")) || 0 });
//         ctx.answerCallbackQuery({ text: "✅ Добавлено в корзину!" });
//     }
// });

// // --- ИНДИВИДУАЛЬНЫЙ ЗАКАЗ ---
// bot.hears("🧩 Индивидуальный заказ", (ctx) => {
//     flowState.set(ctx.from.id, { step: "wait_oem", data: {}, type: "custom" });
//     ctx.reply("Введите OEM номер запчасти (или '-', если не знаете):");
// });

// // --- КОРЗИНА И ОФОРМЛЕНИЕ ---
// bot.hears("🧺 Корзина", async (ctx) => {
//     const cart = getCart(ctx.from.id);
//     if (!cart.length) return ctx.reply("Корзина пуста 🧺");
//     let text = "🧺 **Ваша корзина:**\n\n" + cart.map((it, i) => `${i+1}. ${it.title} ${it.price > 0 ? `(${rub(it.price)})` : ""}`).join("\n");
//     const kb = new InlineKeyboard().text("✅ Оформить всё", "start_checkout").row().text("🧹 Очистить", "clear_cart");
//     ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
// });

// bot.callbackQuery("start_checkout", async (ctx) => {
//     const userId = ctx.from.id;
//     const last = await getLastUserInfo(userId);
//     if (last) {
//         flowState.set(userId, { step: "confirm_data", type: "checkout", data: last });
//         const text = `Ваши данные:\n\n👤 Имя: ${last.name}\n📞 Тел: ${last.phone}\n📍 Адрес: ${last.address}\n🚗 VIN: ${last.vin}\n\nВсе верно?`;
//         const kb = new InlineKeyboard().text("✅ Все верно", "data_ok").text("❌ Ввести заново", "data_new");
//         return ctx.editMessageText(text, { reply_markup: kb });
//     }
//     flowState.set(userId, { step: "name", type: "checkout", data: {} });
//     ctx.editMessageText("Введите **Имя** получателя:", { parse_mode: "Markdown" });
// });

// bot.callbackQuery("data_ok", async (ctx) => {
//     const state = flowState.get(ctx.from.id);
//     if (state) finalizeOrder(ctx, state);
// });

// bot.callbackQuery("data_new", (ctx) => {
//     flowState.set(ctx.from.id, { step: "name", type: "checkout", data: {} });
//     ctx.editMessageText("Введите **Имя** получателя:", { parse_mode: "Markdown" });
// });

// // --- ТЕКСТОВЫЕ ВВОДЫ ---
// bot.on("message:text", async (ctx, next) => {
//     const userId = ctx.from.id;

//     if (isAdmin(ctx) && ctx.session.prepayOrderId) {
//         const amount = ctx.message.text.replace(/\D/g, "");
//         const oid = ctx.session.prepayOrderId;
//         ctx.session.prepayOrderId = null;
//         const doc = await getDoc();
//         const { ordersSheet } = await getSheets(doc);
//         const rows = await ordersSheet.getRows();
//         const row = rows.find(r => s(r.get("order_id")).includes(oid));
//         if (row) {
//             row.set("prepayment", amount);
//             row.set("admin_status", "prepaid");
//             await row.save();
//             ctx.reply(`✅ Предоплата ${amount} ₽ сохранена.`);
//         }
//         return;
//     }

//     const state = flowState.get(userId);
//     if (!state) return next();

//     const text = ctx.message.text.trim();

//     if (state.type === "custom") {
//         if (state.step === "wait_oem") {
//             state.data.oem = text;
//             state.step = "wait_list";
//             return ctx.reply("Напишите, что именно нужно (перечень):");
//         }
//         if (state.step === "wait_list") {
//             getCart(userId).push({ title: `Инд. заказ (OEM: ${state.data.oem})`, info: text, price: 0 });
//             flowState.delete(userId);
//             return ctx.reply("Запрос добавлен в корзину!", { reply_markup: mainMenuKeyboard() });
//         }
//     }

//     if (state.type === "checkout") {
//         switch (state.step) {
//             case "name": state.data.name = text; state.step = "phone"; return ctx.reply("Введите **Телефон**:");
//             case "phone": 
//                 const digits = normalizePhone(text);
//                 if (!isValidPhoneDigits(digits)) return ctx.reply("Ошибка номера.");
//                 state.data.phone = digits; state.step = "vin"; return ctx.reply("Введите **VIN-код**:");
//             case "vin": state.data.vin = text; state.step = "address"; return ctx.reply("Введите **Адрес доставки**:");
//             case "address": state.data.address = text; return finalizeOrder(ctx, state);
//         }
//     }
// });

// async function finalizeOrder(ctx, state) {
//     const userId = ctx.from.id;
//     const cart = getCart(userId);
//     const orderId = String(Date.now());
//     const itemsText = cart.map(it => `- ${it.title}${it.info ? ` [${it.info}]` : ""}`).join("\n");
//     const total = cart.reduce((sum, i) => sum + i.price, 0);

//     const doc = await getDoc();
//     const { ordersSheet } = await getSheets(doc);
//     await ordersSheet.addRow({
//         "order_id": `'${orderId}`,
//         "created_at": new Date().toLocaleString("ru-RU"),
//         "customer": state.data.name,
//         "phone": state.data.phone,
//         "address": state.data.address,
//         "comment": `VIN: ${state.data.vin}`,
//         "items": itemsText,
//         "total": total || "Запрос",
//         "admin_status": "new",
//         "client_status": "оформлен",
//         "user_id": String(userId),
//         "username": ctx.from.username ? `@${ctx.from.username}` : ""
//     });

//     carts.set(userId, []);
//     flowState.delete(userId);
//     const success = `✅ Заказ #${orderId} оформлен!`;
//     ctx.callbackQuery ? await ctx.editMessageText(success) : await ctx.reply(success, { reply_markup: mainMenuKeyboard() });
//     await sendAdminCard(orderId);
// }

// // --- СТАТУСЫ АДМИНА ---
// bot.callbackQuery(/^ast:(\w+):(\d+)$/, async (ctx) => {
//     if (!isAdmin(ctx)) return;
//     const [_, status, oid] = ctx.match;
//     const doc = await getDoc();
//     const { ordersSheet } = await getSheets(doc);
//     const rows = await ordersSheet.getRows();
//     const row = rows.find(r => s(r.get("order_id")).includes(oid));
//     if (row) {
//         row.set("admin_status", status);
//         await row.save();
//         ctx.answerCallbackQuery(`Статус изменен на: ${status}`);
//         // Обновляем карточку админа
//         const text = `📦 ЗАКАЗ #${oid}\n` +
//                  `Клиент: ${row.get("customer")}\n` +
//                  `Тел: ${row.get("phone")}\n` +
//                  `Адрес: ${row.get("address")}\n` +
//                  `Комментарий: ${row.get("comment")}\n\n` +
//                  `Состав:\n${row.get("items")}\n\n` +
//                  `Итого: ${row.get("total")}\n` +
//                  `Статус: ${status}\n` +
//                  `Предоплата: ${row.get("prepayment") || "0"} ₽`;
//         try { await ctx.editMessageText(text, { reply_markup: adminOrderKeyboard(oid) }); } catch(e) {}
//     }
// });

// bot.callbackQuery(/^aprepay:(\d+)$/, async (ctx) => {
//     if (!isAdmin(ctx)) return;
//     ctx.session.prepayOrderId = ctx.match[1];
//     ctx.reply("Введите сумму предоплаты (цифрами):");
//     ctx.answerCallbackQuery();
// });

// bot.hears("📦 Мои заказы", async (ctx) => {
//     const orders = await getUserOrdersFromSheet(ctx.from.id);
//     if (!orders.length) return ctx.reply("Заказов нет.");
//     ctx.reply("Ваши последние заказы:\n\n" + orders.slice(0,5).map(o => `#${o.get("order_id")} - ${o.get("admin_status")}`).join("\n"));
// });

// async function getUserOrdersFromSheet(userId) {
//     const doc = await getDoc();
//     const { ordersSheet } = await getSheets(doc);
//     const rows = await ordersSheet.getRows();
//     return rows.filter(r => String(r.get("user_id")) === String(userId)).reverse();
// }

// bot.hears("ℹ️ Поддержка", (ctx) => ctx.reply("Связь с поддержкой: @admin_username"));

// bot.start();
// console.log("Бот запущен");
// index.js
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

const PRODUCTS_SHEET = String(process.env.PRODUCTS_SHEET || "products").trim();
const ORDERS_SHEET = String(process.env.ORDERS_SHEET || "orders").trim();

if (!SHEET_ID) {
  // Не валим процесс сразу, но логируем — каталог/заказы не будут работать
  console.error("⚠️ SHEET_ID is missing. Google Sheets features will fail.");
}

/* ===================== SESSION ===================== */
bot.use(
  session({
    initial: () => ({
      prepayOrderId: null,
    }),
  })
);

/* ===================== UTILS ===================== */
const s = (x) => String(x ?? "").trim();

const normalizePhoneDigits = (input) => String(input ?? "").replace(/\D/g, "");
const isValidPhoneDigits = (digits) => /^\d{9,15}$/.test(digits);

const rub = (n) => {
  const num = Number(String(n).replace(",", "."));
  return Number.isNaN(num) ? `${n} ₽` : `${num.toLocaleString("ru-RU")} ₽`;
};

const isAdmin = (ctx) => String(ctx.from?.id || "") === ADMIN_ID;

// TRUE/true/1/да/yes — всё считаем активным
const isActive = (v) => {
  const x = String(v ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "да"].includes(x);
};

function mainMenuKeyboard() {
  return new Keyboard()
    .text("🧩 Индивидуальный заказ")
    .text("🛍 Каталог")
    .row()
    .text("📦 Мои заказы")
    .text("🧺 Корзина")
    .row()
    .text("ℹ️ Поддержка")
    .resized();
}

/* ===================== GOOGLE AUTH + CACHE ===================== */
function makeAuth() {
  const email = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const privateKeyRaw = String(process.env.GOOGLE_PRIVATE_KEY || "");

  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing");
  if (!privateKeyRaw) throw new Error("GOOGLE_PRIVATE_KEY is missing");

  // В Fly secrets ключ обычно хранится с \n — превращаем обратно в реальные переводы строк
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

let cachedDoc = null;
let cachedSheets = null;
let cacheLoadedAt = 0;

// Обновляем кеш, например раз в 60 секунд
const CACHE_TTL_MS = 60_000;

async function getDoc() {
  if (!SHEET_ID) throw new Error("SHEET_ID is missing");

  const now = Date.now();
  if (cachedDoc && now - cacheLoadedAt < CACHE_TTL_MS) return cachedDoc;

  const doc = new GoogleSpreadsheet(SHEET_ID, makeAuth());
  await doc.loadInfo();

  cachedDoc = doc;
  cacheLoadedAt = now;
  cachedSheets = null; // при обновлении doc сбрасываем sheets cache
  return doc;
}

async function getSheets(doc) {
  const now = Date.now();
  if (cachedSheets && now - cacheLoadedAt < CACHE_TTL_MS) return cachedSheets;

  const productsSheet = doc.sheetsByTitle[PRODUCTS_SHEET];
  const ordersSheet = doc.sheetsByTitle[ORDERS_SHEET];

  if (!productsSheet) {
    throw new Error(
      `Products sheet not found by title: "${PRODUCTS_SHEET}". Check sheet name in Google Sheets and Fly secrets.`
    );
  }
  if (!ordersSheet) {
    throw new Error(
      `Orders sheet not found by title: "${ORDERS_SHEET}". Check sheet name in Google Sheets and Fly secrets.`
    );
  }

  await productsSheet.loadHeaderRow();
  await ordersSheet.loadHeaderRow();

  cachedSheets = { productsSheet, ordersSheet };
  return cachedSheets;
}

// Удобная обёртка: всё, что связано с Sheets, через try/catch
async function withSheets(fn) {
  try {
    const doc = await getDoc();
    const sheets = await getSheets(doc);
    return await fn(sheets, doc);
  } catch (err) {
    console.error("❌ Google Sheets error:", err?.message || err);
    throw err;
  }
}

/* ===================== IN-MEMORY STATE ===================== */
const carts = new Map(); // userId -> [{title, price, info?}]
const flowState = new Map(); // userId -> { step, type, data }

function getCart(userId) {
  const key = String(userId);
  if (!carts.has(key)) carts.set(key, []);
  return carts.get(key);
}

/* ===================== ADMIN STATUSES ===================== */
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

  await withSheets(async ({ ordersSheet }) => {
    const rows = await ordersSheet.getRows();
    const row = rows.find((r) => String(r.get("order_id")).includes(String(orderId)));
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

    const msg = await bot.api.sendMessage(ADMIN_ID, text, {
      reply_markup: adminOrderKeyboard(orderId),
    });

    row.set("admin_msg_id", String(msg.message_id));
    await row.save();
  });
}

/* ===================== HELPERS ===================== */
async function getLastUserInfo(userId) {
  try {
    return await withSheets(async ({ ordersSheet }) => {
      const rows = await ordersSheet.getRows();
      const userRows = rows
        .filter((r) => String(r.get("user_id")) === String(userId))
        .reverse();

      if (!userRows.length) return null;

      const last = userRows[0];
      const comm = s(last.get("comment"));

      let vin = "";
      if (comm.includes("VIN:")) {
        vin = comm.split("VIN:")[1].split("\n")[0].trim();
      }

      return {
        name: s(last.get("customer")),
        phone: s(last.get("phone")),
        address: s(last.get("address")),
        vin,
      };
    });
  } catch {
    return null;
  }
}

async function getUserOrdersFromSheet(userId) {
  return await withSheets(async ({ ordersSheet }) => {
    const rows = await ordersSheet.getRows();
    return rows
      .filter((r) => String(r.get("user_id")) === String(userId))
      .reverse();
  });
}

/* ===================== BASIC COMMANDS ===================== */
bot.command("start", (ctx) =>
  ctx.reply("Приветствуем в магазине автозапчастей!", {
    reply_markup: mainMenuKeyboard(),
  })
);

/* ===================== CATALOG FLOW ===================== */
// Категории
bot.hears("🛍 Каталог", async (ctx) => {
  try {
    await withSheets(async ({ productsSheet }) => {
      const rows = await productsSheet.getRows();

      const cats = [
        ...new Set(
          rows.map((r) => s(r.get("category"))).filter(Boolean)
        ),
      ];

      const kb = new InlineKeyboard();
      cats.forEach((c) => kb.text(c, `cat:${c}`).row());

      await ctx.reply("🗂 Выберите категорию:", { reply_markup: kb });
    });
  } catch (e) {
    await ctx.reply(
      "Не могу загрузить каталог. Проверь доступ к Google Sheets и названия листов.",
      { reply_markup: mainMenuKeyboard() }
    );
  }
});

bot.callbackQuery("cats", async (ctx) => {
  try {
    await withSheets(async ({ productsSheet }) => {
      const rows = await productsSheet.getRows();
      const cats = [
        ...new Set(rows.map((r) => s(r.get("category"))).filter(Boolean)),
      ];

      const kb = new InlineKeyboard();
      cats.forEach((c) => kb.text(c, `cat:${c}`).row());

      await ctx.editMessageText("🗂 Выберите категорию:", { reply_markup: kb });
    });
  } catch (e) {
    await ctx.answerCallbackQuery({ text: "Ошибка загрузки категорий" });
  }
});

// Товары в категории
bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
  const cat = ctx.match[1];

  try {
    await withSheets(async ({ productsSheet }) => {
      const rows = await productsSheet.getRows();

      const kb = new InlineKeyboard();

      rows
        .filter(
          (r) =>
            s(r.get("category")) === s(cat) &&
            isActive(r.get("active"))
        )
        .forEach((r) => {
          const id = s(r.get("id")); // важно: приводим к строке
          const title = s(r.get("title"));
          const price = r.get("price");

          if (id && title) {
            kb.text(`${title} - ${rub(price)}`, `view_p:${id}:${cat}`).row();
          }
        });

      kb.text("⬅️ Назад в категории", "cats");

      await ctx.editMessageText(`📦 Товары в категории ${cat}:`, {
        reply_markup: kb,
      });
    });
  } catch (e) {
    await ctx.answerCallbackQuery({ text: "Ошибка загрузки товаров" });
  }
});

// Карточка товара
bot.callbackQuery(/^view_p:([^:]+):(.+)$/, async (ctx) => {
  const pid = ctx.match[1];
  const cat = ctx.match[2];

  try {
    await withSheets(async ({ productsSheet }) => {
      const rows = await productsSheet.getRows();

      // FIX: id число/строка — сравниваем строками
      const p = rows.find((r) => s(r.get("id")) === s(pid));

      if (!p) {
        await ctx.answerCallbackQuery({ text: "Товар не найден" });
        return;
      }

      const title = s(p.get("title"));
      const desc = s(p.get("description"));
      const price = p.get("price");

      const text = `**${title}**\n\n${desc || ""}\n\nЦена: ${rub(price)}`;

      const kb = new InlineKeyboard()
        .text("➕ В корзину", `add_p:${s(pid)}`)
        .row()
        .text("⬅️ Назад к товарам", `cat:${cat}`);

      const photoId = s(p.get("tg_file_id"));

      // Если показываем фото — лучше отправить новое сообщение
      if (photoId) {
        await ctx.replyWithPhoto(photoId, {
          caption: text,
          parse_mode: "Markdown",
          reply_markup: kb,
        });
        // И закрываем “часики” у callback
        await ctx.answerCallbackQuery();
      } else {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
    });
  } catch (e) {
    await ctx.answerCallbackQuery({ text: "Ошибка открытия товара" });
  }
});

// Добавить в корзину
bot.callbackQuery(/^add_p:(.+)$/, async (ctx) => {
  const pid = ctx.match[1];

  try {
    await withSheets(async ({ productsSheet }) => {
      const rows = await productsSheet.getRows();

      // FIX: id число/строка
      const p = rows.find((r) => s(r.get("id")) === s(pid));
      if (!p) {
        await ctx.answerCallbackQuery({ text: "Товар не найден" });
        return;
      }

      const item = {
        title: s(p.get("title")),
        price: Number(String(p.get("price")).replace(",", ".")) || 0,
      };

      getCart(ctx.from.id).push(item);

      await ctx.answerCallbackQuery({ text: "✅ Добавлено в корзину!" });
    });
  } catch (e) {
    await ctx.answerCallbackQuery({ text: "Ошибка добавления в корзину" });
  }
});

/* ===================== CUSTOM ORDER FLOW ===================== */
bot.hears("🧩 Индивидуальный заказ", (ctx) => {
  flowState.set(String(ctx.from.id), { step: "wait_oem", data: {}, type: "custom" });
  ctx.reply("Введите OEM номер запчасти (или '-', если не знаете):");
});

/* ===================== CART + CHECKOUT ===================== */
bot.hears("🧺 Корзина", async (ctx) => {
  const cart = getCart(ctx.from.id);
  if (!cart.length) return ctx.reply("Корзина пуста 🧺", { reply_markup: mainMenuKeyboard() });

  const lines = cart.map((it, i) => {
    const pricePart = it.price > 0 ? `(${rub(it.price)})` : "";
    const infoPart = it.info ? ` [${it.info}]` : "";
    return `${i + 1}. ${it.title}${infoPart} ${pricePart}`.trim();
  });

  const total = cart.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  const text = `🧺 **Ваша корзина:**\n\n${lines.join("\n")}\n\n**Итого:** ${total ? rub(total) : "Запрос"}`;

  const kb = new InlineKeyboard()
    .text("✅ Оформить всё", "start_checkout")
    .row()
    .text("🧹 Очистить", "clear_cart");

  ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery("clear_cart", async (ctx) => {
  carts.set(String(ctx.from.id), []);
  await ctx.editMessageText("Корзина очищена ✅");
});

bot.callbackQuery("start_checkout", async (ctx) => {
  const userId = String(ctx.from.id);
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

    const kb = new InlineKeyboard()
      .text("✅ Все верно", "data_ok")
      .text("❌ Ввести заново", "data_new");

    return ctx.editMessageText(text, { reply_markup: kb });
  }

  flowState.set(userId, { step: "name", type: "checkout", data: {} });
  return ctx.editMessageText("Введите **Имя** получателя:", { parse_mode: "Markdown" });
});

bot.callbackQuery("data_ok", async (ctx) => {
  const state = flowState.get(String(ctx.from.id));
  if (state) await finalizeOrder(ctx, state);
});

bot.callbackQuery("data_new", async (ctx) => {
  flowState.set(String(ctx.from.id), { step: "name", type: "checkout", data: {} });
  await ctx.editMessageText("Введите **Имя** получателя:", { parse_mode: "Markdown" });
});

/* ===================== TEXT INPUT HANDLER ===================== */
bot.on("message:text", async (ctx, next) => {
  const userId = String(ctx.from.id);

  // Админ вводит предоплату
  if (isAdmin(ctx) && ctx.session.prepayOrderId) {
    const amount = String(ctx.message.text).replace(/\D/g, "");
    const oid = ctx.session.prepayOrderId;

    ctx.session.prepayOrderId = null;

    try {
      await withSheets(async ({ ordersSheet }) => {
        const rows = await ordersSheet.getRows();
        const row = rows.find((r) => String(r.get("order_id")).includes(String(oid)));
        if (row) {
          row.set("prepayment", amount);
          row.set("admin_status", "prepaid");
          await row.save();
          await ctx.reply(`✅ Предоплата ${amount} ₽ сохранена.`);
        } else {
          await ctx.reply("Не нашёл заказ по ID.");
        }
      });
    } catch {
      await ctx.reply("Ошибка сохранения предоплаты (Sheets).");
    }
    return;
  }

  const state = flowState.get(userId);
  if (!state) return next();

  const text = ctx.message.text.trim();

  // Индивидуальный заказ
  if (state.type === "custom") {
    if (state.step === "wait_oem") {
      state.data.oem = text;
      state.step = "wait_list";
      return ctx.reply("Напишите, что именно нужно (перечень):");
    }
    if (state.step === "wait_list") {
      getCart(userId).push({
        title: `Инд. заказ (OEM: ${state.data.oem})`,
        info: text,
        price: 0,
      });
      flowState.delete(userId);
      return ctx.reply("Запрос добавлен в корзину!", { reply_markup: mainMenuKeyboard() });
    }
  }

  // Оформление
  if (state.type === "checkout") {
    switch (state.step) {
      case "name":
        state.data.name = text;
        state.step = "phone";
        return ctx.reply("Введите **Телефон**:", { parse_mode: "Markdown" });

      case "phone": {
        const digits = normalizePhoneDigits(text);
        if (!isValidPhoneDigits(digits)) return ctx.reply("Ошибка номера. Введите 9–15 цифр.");
        state.data.phone = digits;
        state.step = "vin";
        return ctx.reply("Введите **VIN-код** (или '-', если нет):", { parse_mode: "Markdown" });
      }

      case "vin":
        state.data.vin = text;
        state.step = "address";
        return ctx.reply("Введите **Адрес доставки**:", { parse_mode: "Markdown" });

      case "address":
        state.data.address = text;
        return finalizeOrder(ctx, state);
    }
  }
});

/* ===================== ORDER FINALIZE ===================== */
async function finalizeOrder(ctx, state) {
  const userId = String(ctx.from.id);
  const cart = getCart(userId);

  if (!cart.length) {
    flowState.delete(userId);
    return ctx.reply("Корзина пуста 🧺", { reply_markup: mainMenuKeyboard() });
  }

  const orderId = String(Date.now());
  const itemsText = cart
    .map((it) => `- ${it.title}${it.info ? ` [${it.info}]` : ""}`)
    .join("\n");

  const totalNum = cart.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  try {
    await withSheets(async ({ ordersSheet }) => {
      await ordersSheet.addRow({
        order_id: `'${orderId}`, // чтобы Sheets не превратил в число/экспоненту
        created_at: new Date().toLocaleString("ru-RU"),
        customer: state.data.name,
        phone: state.data.phone,
        address: state.data.address,
        comment: `VIN: ${state.data.vin || "-"}`,
        items: itemsText,
        total: totalNum ? String(totalNum) : "Запрос",
        admin_status: "new",
        client_status: "оформлен",
        user_id: String(userId),
        username: ctx.from.username ? `@${ctx.from.username}` : "",
      });
    });
  } catch (e) {
    console.error("❌ finalizeOrder error:", e?.message || e);
    return ctx.reply(
      "Не удалось оформить заказ (ошибка Google Sheets). Проверь доступы сервисного аккаунта и SHEET_ID.",
      { reply_markup: mainMenuKeyboard() }
    );
  }

  // очищаем
  carts.set(userId, []);
  flowState.delete(userId);

  const success = `✅ Заказ #${orderId} оформлен!`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(success);
  } else {
    await ctx.reply(success, { reply_markup: mainMenuKeyboard() });
  }

  await sendAdminCard(orderId);
}

/* ===================== ADMIN CALLBACKS ===================== */
bot.callbackQuery(/^ast:(\w+):(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;

  const status = ctx.match[1];
  const oid = ctx.match[2];

  try {
    await withSheets(async ({ ordersSheet }) => {
      const rows = await ordersSheet.getRows();
      const row = rows.find((r) => String(r.get("order_id")).includes(String(oid)));

      if (!row) {
        await ctx.answerCallbackQuery({ text: "Заказ не найден" });
        return;
      }

      row.set("admin_status", status);
      await row.save();

      await ctx.answerCallbackQuery({ text: `Статус: ${status}` });

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
      } catch (_) {}
    });
  } catch {
    await ctx.answerCallbackQuery({ text: "Ошибка (Sheets)" });
  }
});

bot.callbackQuery(/^aprepay:(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  ctx.session.prepayOrderId = ctx.match[1];
  await ctx.reply("Введите сумму предоплаты (цифрами):");
  await ctx.answerCallbackQuery();
});

/* ===================== MY ORDERS ===================== */
bot.hears("📦 Мои заказы", async (ctx) => {
  try {
    const orders = await getUserOrdersFromSheet(ctx.from.id);
    if (!orders.length) return ctx.reply("Заказов нет.", { reply_markup: mainMenuKeyboard() });

    const text =
      "Ваши последние заказы:\n\n" +
      orders
        .slice(0, 5)
        .map((o) => `#${o.get("order_id")} — ${o.get("admin_status")}`)
        .join("\n");

    await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
  } catch {
    await ctx.reply("Не могу получить заказы (Sheets).", { reply_markup: mainMenuKeyboard() });
  }
});

/* ===================== SUPPORT ===================== */
bot.hears("ℹ️ Поддержка", (ctx) =>
  ctx.reply("Связь с поддержкой: @admin_username", { reply_markup: mainMenuKeyboard() })
);

/* ===================== GLOBAL ERROR HANDLING ===================== */
bot.catch((err) => {
  console.error("❌ Bot error:", err?.error?.message || err?.message || err);
});

/* ===================== START ===================== */
bot.start();
console.log("✅ Bot started");