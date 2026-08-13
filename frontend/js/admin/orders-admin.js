/**
 * iFaruk.Stores — Admin order management (orders.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-orders-table]")) return;
  initOrdersPage();
});

function initOrdersPage() {
  const searchInput = document.querySelector("[data-order-search]");
  const statusFilter = document.querySelector("[data-order-status-filter]");

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAndRenderOrders, 350);
    });
  }
  if (statusFilter) statusFilter.addEventListener("change", fetchAndRenderOrders);

  bindOrderDetailModal();
  fetchAndRenderOrders();
}

function buildOrderQuery() {
  const params = new URLSearchParams();
  const search = document.querySelector("[data-order-search]")?.value.trim();
  const status = document.querySelector("[data-order-status-filter]")?.value;
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return `?${params.toString()}`;
}

let ordersCache = [];

async function fetchAndRenderOrders() {
  const tableBody = document.querySelector("[data-orders-table] tbody");
  const cardsRoot = document.querySelector("[data-orders-cards]");
  tableBody.innerHTML = `<tr><td colspan="6">${loadingBlock("Loading orders...")}</td></tr>`;

  try {
    const { orders } = await API.getOrders(buildOrderQuery());
    ordersCache = orders;

    if (!orders.length) {
      tableBody.innerHTML = `<tr><td colspan="6">${emptyBlock(
        "No orders found.",
        "Orders placed by customers will appear here."
      )}</td></tr>`;
      if (cardsRoot) cardsRoot.innerHTML = "";
      return;
    }

    tableBody.innerHTML = orders.map(orderRowHTML).join("");
    if (cardsRoot) cardsRoot.innerHTML = orders.map(orderCardRowHTML).join("");
    attachOrderRowEvents();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6">${errorBlock(error.message)}</td></tr>`;
  }
}

function orderRowHTML(order) {
  return `
    <tr data-order-row="${order._id}">
      <td>${escapeHtml(order.orderId)}</td>
      <td>${escapeHtml(order.customer.fullName)}<br><span style="color:var(--color-text-muted);font-size:0.85rem;">${escapeHtml(
    order.customer.phone
  )}</span></td>
      <td>${formatCurrency(order.total)}</td>
      <td><span class="badge badge--status-${order.status.toLowerCase()}">${order.status}</span></td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        <button type="button" class="btn btn-secondary btn-sm" data-view-order="${order._id}">View</button>
      </td>
    </tr>
  `;
}

function orderCardRowHTML(order) {
  return `
    <div class="admin-card" data-order-row="${order._id}">
      <div class="admin-card__row"><strong>${escapeHtml(order.orderId)}</strong> <span class="badge badge--status-${order.status.toLowerCase()}">${order.status}</span></div>
      <div class="admin-card__row"><span>Customer</span><span>${escapeHtml(order.customer.fullName)}</span></div>
      <div class="admin-card__row"><span>Total</span><span>${formatCurrency(order.total)}</span></div>
      <div class="admin-card__row"><span>Date</span><span>${new Date(
        order.createdAt
      ).toLocaleDateString()}</span></div>
      <button type="button" class="btn btn-secondary btn-sm btn-block" style="margin-top:10px;" data-view-order="${order._id}">View Order</button>
    </div>
  `;
}

function attachOrderRowEvents() {
  document.querySelectorAll("[data-view-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const order = ordersCache.find((o) => o._id === btn.dataset.viewOrder);
      if (order) openOrderDetailModal(order);
    });
  });
}

function bindOrderDetailModal() {
  const overlay = document.querySelector("[data-order-modal]");
  const closeBtn = document.querySelector("[data-close-order-modal]");
  if (closeBtn) closeBtn.addEventListener("click", closeOrderDetailModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOrderDetailModal();
    });
  }
}

function openOrderDetailModal(order) {
  const overlay = document.querySelector("[data-order-modal]");
  const body = document.querySelector("[data-order-modal-body]");

  const statusOptions = ["New", "Contacted", "Confirmed", "Completed", "Cancelled"]
    .map(
      (s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`
    )
    .join("");

  body.innerHTML = `
    <h3 style="margin-bottom:4px;">${escapeHtml(order.orderId)}</h3>
    <p style="color:var(--color-text-muted);margin-bottom:24px;">${new Date(
      order.createdAt
    ).toLocaleString()}</p>

    <h4 style="margin-bottom:10px;">Customer</h4>
    <p style="margin-bottom:4px;">${escapeHtml(order.customer.fullName)} — ${escapeHtml(order.customer.phone)}</p>
    <p style="margin-bottom:24px;color:var(--color-text-muted);">${escapeHtml(order.customer.deliveryLocation)}, ${escapeHtml(
    order.customer.city || ""
  )} ${escapeHtml(order.customer.state)}</p>

    <h4 style="margin-bottom:10px;">Products</h4>
    <table class="spec-table" style="margin-bottom:10px;">
      ${order.products
        .map(
          (p) => `<tr><td>${escapeHtml(p.name)} &times; ${p.quantity}</td><td>${formatCurrency(
            p.subtotal
          )}</td></tr>`
        )
        .join("")}
      <tr><td><strong>Total</strong></td><td><strong>${formatCurrency(order.total)}</strong></td></tr>
    </table>

    ${
      order.note
        ? `<h4 style="margin-bottom:10px;">Note</h4><p style="margin-bottom:24px;">${escapeHtml(
            order.note
          )}</p>`
        : ""
    }

    <div class="form-group">
      <label class="form-label" for="order-status-select">Order Status</label>
      <select id="order-status-select" class="form-control status-select" data-order-status-select>
        ${statusOptions}
      </select>
    </div>

    <div class="row-actions" style="margin-top:20px;">
      <button type="button" class="btn btn-primary" data-save-order-status="${order._id}">Update Status</button>
      <a href="${whatsappOrderContactUrl(order)}" target="_blank" rel="noopener" class="btn btn-whatsapp">Contact via WhatsApp</a>
    </div>
  `;

  body
    .querySelector("[data-save-order-status]")
    .addEventListener("click", async (e) => {
      const select = body.querySelector("[data-order-status-select]");
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Updating...";
      try {
        await API.updateOrder(order._id, { status: select.value });
        showToast("Order status updated", "success");
        closeOrderDetailModal();
        fetchAndRenderOrders();
      } catch (error) {
        showToast(error.message, "error");
        btn.disabled = false;
        btn.textContent = "Update Status";
      }
    });

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeOrderDetailModal() {
  document.querySelector("[data-order-modal]").hidden = true;
  document.body.style.overflow = "";
}

function whatsappOrderContactUrl(order) {
  const message = `Hello ${order.customer.fullName}, this is iFaruk.Stores following up on your order ${order.orderId}.`;
  return `https://wa.me/${order.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    message
  )}`;
}
