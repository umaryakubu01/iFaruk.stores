/**
 * iFaruk.Stores — Admin dashboard (dashboard.html)
 */

document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  await Promise.all([loadStats(), loadRecentOrders()]);
}

async function loadStats() {
  const grid = document.querySelector("[data-stat-grid]");
  if (!grid) return;

  try {
    const [all, inStock, lowStock, outOfStock, orders] = await Promise.all([
      API.getProducts("?limit=1"),
      API.getProducts("?availability=in-stock&limit=1"),
      API.getProducts("?availability=low-stock&limit=1"),
      API.getProducts("?availability=out-of-stock&limit=1"),
      API.getOrders(),
    ]);

    const newOrders = orders.orders.filter((o) => o.status === "New").length;

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card__label">Total Products</div>
        <div class="stat-card__value">${all.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Available Products</div>
        <div class="stat-card__value">${inStock.total}</div>
      </div>
      <div class="stat-card stat-card--alert">
        <div class="stat-card__label">Low Stock</div>
        <div class="stat-card__value">${lowStock.total}</div>
      </div>
      <div class="stat-card stat-card--alert">
        <div class="stat-card__label">Out of Stock</div>
        <div class="stat-card__value">${outOfStock.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Total Orders</div>
        <div class="stat-card__value">${orders.orders.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">New Orders</div>
        <div class="stat-card__value">${newOrders}</div>
      </div>
    `;
  } catch (error) {
    grid.innerHTML = errorBlock(error.message);
  }
}

async function loadRecentOrders() {
  const container = document.querySelector("[data-recent-orders]");
  if (!container) return;

  try {
    const { orders } = await API.getOrders();
    const recent = orders.slice(0, 6);

    if (!recent.length) {
      container.innerHTML = emptyBlock("No orders found.", "New orders will appear here.");
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr>
        </thead>
        <tbody>
          ${recent
            .map(
              (order) => `
            <tr>
              <td><a href="orders.html">${escapeHtml(order.orderId)}</a></td>
              <td>${escapeHtml(order.customer.fullName)}</td>
              <td>${formatCurrency(order.total)}</td>
              <td><span class="badge badge--status-${order.status.toLowerCase()}">${order.status}</span></td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = errorBlock(error.message);
  }
}
