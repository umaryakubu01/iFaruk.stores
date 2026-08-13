/**
 * iFaruk.Stores — Shared site behaviour
 * Loaded on every customer-facing page: mobile navigation, toast
 * notifications, cart badge count, and small formatting helpers.
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  updateCartBadge();
  setFooterYear();
  initWhatsAppFloat();
});

/* ---------------------------------------------------------------- */
/* Mobile navigation                                                 */
/* ---------------------------------------------------------------- */
function initMobileNav() {
  const openBtn = document.querySelector("[data-nav-open]");
  const closeBtn = document.querySelector("[data-nav-close]");
  const nav = document.querySelector("[data-mobile-nav]");

  if (!openBtn || !nav) return;

  openBtn.addEventListener("click", () => {
    nav.classList.add("is-open");
    document.body.style.overflow = "hidden";
    openBtn.setAttribute("aria-expanded", "true");
  });

  const close = () => {
    nav.classList.remove("is-open");
    document.body.style.overflow = "";
    openBtn.setAttribute("aria-expanded", "false");
  };

  if (closeBtn) closeBtn.addEventListener("click", close);

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

/* ---------------------------------------------------------------- */
/* Toast notifications                                               */
/* ---------------------------------------------------------------- */
function ensureToastRegion() {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  return region;
}

function showToast(message, type = "success") {
  const region = ensureToastRegion();
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  region.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 200ms ease";
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

/* ---------------------------------------------------------------- */
/* Cart badge (reads from Cart module defined in cart.js)            */
/* ---------------------------------------------------------------- */
function updateCartBadge() {
  const badge = document.querySelector("[data-cart-count]");
  if (!badge || typeof Cart === "undefined") return;
  const count = Cart.getItemCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

/* ---------------------------------------------------------------- */
/* WhatsApp floating button                                          */
/* ---------------------------------------------------------------- */
function initWhatsAppFloat() {
  const float = document.querySelector("[data-whatsapp-float]");
  if (!float || typeof whatsappChatUrl !== "function") return;
  float.href = whatsappChatUrl();
}

/* ---------------------------------------------------------------- */
/* Footer year                                                       */
/* ---------------------------------------------------------------- */
function setFooterYear() {
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------- */
/* Shared render helpers                                             */
/* ---------------------------------------------------------------- */
function availabilityBadge(stock) {
  if (stock <= 0) {
    return `<span class="badge badge--out-of-stock">Out of Stock</span>`;
  }
  if (stock <= 5) {
    return `<span class="badge badge--low-stock">Low Stock</span>`;
  }
  return `<span class="badge badge--in-stock">In Stock</span>`;
}

function productImageUrl(product) {
  if (product && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0].url || "";
  }
  return "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function loadingBlock(message = "Loading...") {
  return `<div class="state-block"><div class="spinner"></div><p>${escapeHtml(
    message
  )}</p></div>`;
}

function emptyBlock(title, message) {
  return `<div class="state-block"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(
    message
  )}</p></div>`;
}

function errorBlock(message) {
  return `<div class="state-block"><h4>Something went wrong</h4><p>${escapeHtml(
    message
  )}</p></div>`;
}
