/**
 * iFaruk.Stores — Shopping cart
 * The cart lives entirely in localStorage so it survives page refreshes.
 * Stock limits are enforced against the latest data fetched from the API.
 */

const Cart = (() => {
  const STORAGE_KEY = "ifaruk_cart";

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getItems() {
    return read();
  }

  function getItemCount() {
    return read().reduce((sum, item) => sum + item.quantity, 0);
  }

  function getSubtotal() {
    return read().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // stockAvailable is the current known stock for this product, used to
  // stop the customer from adding more than what's available.
  function addItem(product, quantity, stockAvailable) {
    const items = read();
    const existing = items.find((item) => item.productId === product._id);
    const maxAllowed = typeof stockAvailable === "number" ? stockAvailable : Infinity;

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, maxAllowed);
      existing.quantity = newQty;
    } else {
      items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: productImageUrl(product),
        quantity: Math.min(quantity, maxAllowed),
        maxStock: maxAllowed,
      });
    }

    write(items);
    return items;
  }

  function updateQuantity(productId, quantity) {
    const items = read();
    const item = items.find((i) => i.productId === productId);
    if (!item) return items;

    const max = typeof item.maxStock === "number" ? item.maxStock : Infinity;
    item.quantity = Math.max(1, Math.min(quantity, max));
    write(items);
    return items;
  }

  function removeItem(productId) {
    const items = read().filter((item) => item.productId !== productId);
    write(items);
    return items;
  }

  function clear() {
    write([]);
  }

  return {
    getItems,
    getItemCount,
    getSubtotal,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };
})();

/* ---------------------------------------------------------------- */
/* Cart page rendering (only runs on cart.html)                      */
/* ---------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const cartRoot = document.querySelector("[data-cart-root]");
  if (!cartRoot) return; // Not on the cart page
  renderCartPage();
});

function renderCartPage() {
  const listEl = document.querySelector("[data-cart-list]");
  const summaryEl = document.querySelector("[data-cart-summary]");
  const items = Cart.getItems();

  if (!items.length) {
    listEl.innerHTML = emptyBlock(
      "Your cart is empty",
      "Browse our collection of luxury watches and accessories to find something you love."
    );
    summaryEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item" data-cart-item="${item.productId}">
        <div class="cart-item__image">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.style.visibility='hidden'">
        </div>
        <div>
          <h4 class="cart-item__name">${escapeHtml(item.name)}</h4>
          <p class="cart-item__meta">${formatCurrency(item.price)} each</p>
          <div class="cart-item__controls">
            <div class="qty-stepper">
              <button type="button" aria-label="Decrease quantity" data-qty-decrease>&minus;</button>
              <input type="number" min="1" value="${item.quantity}" aria-label="Quantity for ${escapeHtml(
        item.name
      )}" data-qty-input>
              <button type="button" aria-label="Increase quantity" data-qty-increase>&plus;</button>
            </div>
            <button type="button" class="cart-item__remove" data-remove-item>Remove</button>
          </div>
        </div>
        <p class="cart-item__price">${formatCurrency(item.price * item.quantity)}</p>
      </div>
    `
    )
    .join("");

  const subtotal = Cart.getSubtotal();
  summaryEl.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>Discussed via WhatsApp</span></div>
    <div class="summary-row summary-row--total"><span>Total</span><span>${formatCurrency(subtotal)}</span></div>
    <button type="button" class="btn btn-primary btn-block" style="margin-top:24px;" data-proceed-to-checkout>Proceed to Order</button>
    <a href="shop.html" class="btn btn-secondary btn-block" style="margin-top:12px;">Continue Shopping</a>
  `;

  const proceedBtn = document.querySelector("[data-proceed-to-checkout]");
  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      if (typeof showCheckoutStep === "function") showCheckoutStep();
    });
  }

  attachCartItemEvents();
}

function attachCartItemEvents() {
  document.querySelectorAll("[data-cart-item]").forEach((row) => {
    const productId = row.dataset.cartItem;
    const input = row.querySelector("[data-qty-input]");

    row.querySelector("[data-qty-decrease]").addEventListener("click", () => {
      Cart.updateQuantity(productId, Number(input.value) - 1);
      renderCartPage();
      updateCartBadge();
    });

    row.querySelector("[data-qty-increase]").addEventListener("click", () => {
      Cart.updateQuantity(productId, Number(input.value) + 1);
      renderCartPage();
      updateCartBadge();
    });

    input.addEventListener("change", () => {
      Cart.updateQuantity(productId, Number(input.value) || 1);
      renderCartPage();
      updateCartBadge();
    });

    row.querySelector("[data-remove-item]").addEventListener("click", () => {
      Cart.removeItem(productId);
      showToast("Product removed from cart", "success");
      renderCartPage();
      updateCartBadge();
    });
  });
}
