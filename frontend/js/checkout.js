/**
 * iFaruk.Stores — Checkout
 * Runs on cart.html. Once the customer clicks "Proceed to Order" this
 * module takes over: collects customer details, validates them, submits
 * the order to the backend, and finally redirects to WhatsApp.
 */

function showCheckoutStep() {
  const cartStep = document.querySelector("[data-step-cart]");
  const checkoutStep = document.querySelector("[data-step-checkout]");
  if (!cartStep || !checkoutStep) return;

  cartStep.hidden = true;
  checkoutStep.hidden = false;
  renderCheckoutSummary();
  document
    .querySelectorAll("[data-checkout-progress] span")
    .forEach((el, i) => el.classList.toggle("is-active", i <= 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCartStep() {
  const cartStep = document.querySelector("[data-step-cart]");
  const checkoutStep = document.querySelector("[data-step-checkout]");
  if (!cartStep || !checkoutStep) return;

  checkoutStep.hidden = true;
  cartStep.hidden = false;
  document
    .querySelectorAll("[data-checkout-progress] span")
    .forEach((el, i) => el.classList.toggle("is-active", i === 0));
}

function renderCheckoutSummary() {
  const summaryEl = document.querySelector("[data-checkout-order-summary]");
  if (!summaryEl) return;

  const items = Cart.getItems();
  const subtotal = Cart.getSubtotal();

  summaryEl.innerHTML = `
    <h4 style="margin-bottom:16px;">Your Order</h4>
    ${items
      .map(
        (item) => `
      <div class="summary-row">
        <span>${escapeHtml(item.name)} &times; ${item.quantity}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `
      )
      .join("")}
    <div class="summary-row summary-row--total">
      <span>Total</span><span>${formatCurrency(subtotal)}</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.querySelector("[data-back-to-cart]");
  if (backBtn) backBtn.addEventListener("click", showCartStep);

  const form = document.querySelector("[data-checkout-form]");
  if (form) form.addEventListener("submit", handleCheckoutSubmit);
});

function validateField(input) {
  const errorEl = input.parentElement.querySelector(".form-error");
  const value = input.value.trim();
  let message = "";

  if (input.required && !value) {
    message = "This field is required.";
  } else if (input.type === "tel" && value && !/^[0-9+\s-]{7,20}$/.test(value)) {
    message = "Please enter a valid phone number.";
  }

  input.classList.toggle("is-invalid", Boolean(message));
  if (errorEl) errorEl.textContent = message;
  return !message;
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const inputs = form.querySelectorAll("[required]");
  let isValid = true;

  inputs.forEach((input) => {
    if (!validateField(input)) isValid = false;
  });

  if (!isValid) {
    showToast("Please fill in all required fields correctly.", "error");
    return;
  }

  const items = Cart.getItems();
  if (!items.length) {
    showToast("Your cart is empty.", "error");
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Placing your order...";

  const payload = {
    customer: {
      fullName: form.fullName.value.trim(),
      phone: form.phone.value.trim(),
      deliveryLocation: form.deliveryLocation.value.trim(),
      state: form.state.value.trim(),
      city: form.city.value.trim(),
    },
    note: form.note.value.trim(),
    products: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  };

  try {
    const { whatsappUrl } = await API.createOrder(payload);
    Cart.clear();
    updateCartBadge();
    showToast("Order created! Redirecting you to WhatsApp...", "success");
    setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 900);
  } catch (error) {
    showToast(error.message || "We could not create your order. Please try again.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Order via WhatsApp";
  }
}
