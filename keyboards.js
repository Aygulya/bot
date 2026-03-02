const { InlineKeyboard, Keyboard } = require("grammy");

function mainMenuKeyboard() {
  return new Keyboard()
    .text("🛍 Каталог")
    .text("🧺 Корзина")
    .row()
    .text("📦 Мои заказы")
    .text("ℹ️ Поддержка")
    .resized();
}

function productKeyboard(productId) {
  return new InlineKeyboard()
    .text("➕ В корзину", `add:${productId}`)
    .row()
    .text("⬅️ Назад в каталог", "catalog");
}

function cartKeyboard(hasItems) {
  const kb = new InlineKeyboard();
  if (hasItems) {
    kb.text("✅ Оформить заказ", "checkout").row();
    kb.text("🧹 Очистить корзину", "cart_clear").row();
  }
  kb.text("⬅️ В каталог", "catalog");
  return kb;
}

module.exports = { mainMenuKeyboard, productKeyboard, cartKeyboard };
