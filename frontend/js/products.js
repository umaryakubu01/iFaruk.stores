/**
 * iFaruk.Stores — Product listing logic
 * Powers the homepage's featured/new-arrival rails and the full shop
 * catalog (search, filter, sort, pagination). All data is fetched live
 * from the REST API - nothing is hard-coded.
 */

function productCardHTML(product) {
  const image = productImageUrl(product);
  const categoryName = product.category && product.category.name ? product.category.name : "";
  const outOfStock = product.stock <= 0;

  return `
    <article class="product-card">
      <div class="product-card__image">
        ${
          product.newArrival
            ? `<span class="product-card__badge">New Arrival</span>`
            : ""
        }
        ${
          outOfStock
            ? `<span class="product-card__badge product-card__badge--stock">Out of Stock</span>`
            : ""
        }
        <a href="product.html?id=${product._id}">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy"
               onerror="this.src='';this.style.background='var(--color-porcelain-deep)'">
        </a>
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${escapeHtml(categoryName)}</span>
        <h3 class="product-card__name"><a href="product.html?id=${product._id}">${escapeHtml(
    product.name
  )}</a></h3>
        <p class="product-card__price">${formatCurrency(product.price)}</p>
        <div class="product-card__actions">
          <a href="product.html?id=${product._id}" class="btn btn-secondary btn-sm">View Product</a>
          <button type="button" class="btn btn-primary btn-sm" data-quick-add="${product._id}" ${
    outOfStock ? "disabled" : ""
  }>Add to Cart</button>
        </div>
      </div>
    </article>
  `;
}

function attachQuickAddEvents(container, products) {
  container.querySelectorAll("[data-quick-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((p) => p._id === btn.dataset.quickAdd);
      if (!product) return;
      Cart.addItem(product, 1, product.stock);
      updateCartBadge();
      showToast(`${product.name} added to cart`, "success");
    });
  });
}

/* ---------------------------------------------------------------- */
/* Homepage rails: Featured, New Arrivals                            */
/* ---------------------------------------------------------------- */
async function loadHomepageRail(selector, query) {
  const root = document.querySelector(selector);
  if (!root) return;
  root.innerHTML = loadingBlock("Loading products...");

  try {
    const { products } = await API.getProducts(query);
    if (!products.length) {
      root.innerHTML = emptyBlock("No products found.", "Check back soon for new pieces.");
      return;
    }
    root.innerHTML = products.map(productCardHTML).join("");
    attachQuickAddEvents(root, products);
  } catch (error) {
    root.innerHTML = errorBlock(error.message);
  }
}

async function loadCategoryShowcase() {
  const root = document.querySelector("[data-category-grid]");
  if (!root) return;

  try {
    const { categories } = await API.getCategories();
    if (!categories.length) {
      root.innerHTML = "";
      return;
    }
    root.innerHTML = categories
      .slice(0, 10)
      .map(
        (cat) => `
        <a class="category-card" href="shop.html?category=${cat._id}">
          <img src="" alt="${escapeHtml(cat.name)}" loading="lazy">
          <span class="category-card__label">${escapeHtml(cat.name)}</span>
        </a>
      `
      )
      .join("");
  } catch (error) {
    root.innerHTML = "";
  }
}

/* ---------------------------------------------------------------- */
/* Shop page: full catalog with filters, search, sort, pagination    */
/* ---------------------------------------------------------------- */
const ShopState = {
  search: "",
  category: "",
  availability: "",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  page: 1,
};

document.addEventListener("DOMContentLoaded", () => {
  loadHomepageRail("[data-featured-grid]", "?featured=true&limit=8");
  loadHomepageRail("[data-new-arrivals-grid]", "?newArrival=true&limit=8");
  loadHomepageRail("[data-accessories-grid]", "?limit=8");
  loadCategoryShowcase();

  if (document.querySelector("[data-shop-grid]")) {
    initShopPage();
  }
});

async function initShopPage() {
  await populateShopFilters();
  readShopStateFromUrl();
  bindShopControls();
  fetchAndRenderShop();
}

async function populateShopFilters() {
  const categoryList = document.querySelector("[data-category-filters]");
  if (!categoryList) return;

  try {
    const { categories } = await API.getCategories();
    categoryList.innerHTML = categories
      .map(
        (cat) => `
        <label class="filters__option">
          <input type="radio" name="category" value="${cat._id}" data-category-radio>
          ${escapeHtml(cat.name)}
        </label>
      `
      )
      .join("");
  } catch (error) {
    categoryList.innerHTML = "";
  }
}

function readShopStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  ShopState.category = params.get("category") || "";
  ShopState.search = params.get("search") || "";

  const searchInput = document.querySelector("[data-search-input]");
  if (searchInput) searchInput.value = ShopState.search;

  if (ShopState.category) {
    const radio = document.querySelector(
      `[data-category-radio][value="${ShopState.category}"]`
    );
    if (radio) radio.checked = true;
  }
}

function bindShopControls() {
  const searchInput = document.querySelector("[data-search-input]");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        ShopState.search = searchInput.value.trim();
        ShopState.page = 1;
        fetchAndRenderShop();
      }, 350);
    });
  }

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-category-radio]")) {
      ShopState.category = event.target.value;
      ShopState.page = 1;
      fetchAndRenderShop();
    }
    if (event.target.matches("[data-availability-radio]")) {
      ShopState.availability = event.target.value;
      ShopState.page = 1;
      fetchAndRenderShop();
    }
    if (event.target.matches("[data-sort-select]")) {
      ShopState.sort = event.target.value;
      fetchAndRenderShop();
    }
  });

  const priceForm = document.querySelector("[data-price-filter]");
  if (priceForm) {
    priceForm.addEventListener("submit", (event) => {
      event.preventDefault();
      ShopState.minPrice = priceForm.querySelector("[name=minPrice]").value;
      ShopState.maxPrice = priceForm.querySelector("[name=maxPrice]").value;
      ShopState.page = 1;
      fetchAndRenderShop();
    });
  }

  const clearBtn = document.querySelector("[data-clear-filters]");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      Object.assign(ShopState, {
        search: "",
        category: "",
        availability: "",
        minPrice: "",
        maxPrice: "",
        sort: "newest",
        page: 1,
      });
      document.querySelectorAll('input[type="radio"]').forEach((r) => (r.checked = false));
      if (searchInput) searchInput.value = "";
      if (priceForm) priceForm.reset();
      fetchAndRenderShop();
    });
  }
}

function buildShopQuery() {
  const params = new URLSearchParams();
  if (ShopState.search) params.set("search", ShopState.search);
  if (ShopState.category) params.set("category", ShopState.category);
  if (ShopState.availability) params.set("availability", ShopState.availability);
  if (ShopState.minPrice) params.set("minPrice", ShopState.minPrice);
  if (ShopState.maxPrice) params.set("maxPrice", ShopState.maxPrice);
  if (ShopState.sort) params.set("sort", ShopState.sort);
  params.set("page", ShopState.page);
  params.set("limit", 12);
  return `?${params.toString()}`;
}

async function fetchAndRenderShop() {
  const grid = document.querySelector("[data-shop-grid]");
  const countLabel = document.querySelector("[data-result-count]");
  const paginationEl = document.querySelector("[data-pagination]");

  grid.innerHTML = loadingBlock("Loading the collection...");
  if (paginationEl) paginationEl.innerHTML = "";

  try {
    const { products, total, page, pages } = await API.getProducts(buildShopQuery());

    if (countLabel) {
      countLabel.textContent = `${total} product${total === 1 ? "" : "s"} found`;
    }

    if (!products.length) {
      grid.innerHTML = emptyBlock(
        "No products found.",
        "Try adjusting your search or filters."
      );
      return;
    }

    grid.innerHTML = products.map(productCardHTML).join("");
    attachQuickAddEvents(grid, products);

    if (paginationEl && pages > 1) {
      paginationEl.innerHTML = Array.from({ length: pages }, (_, i) => i + 1)
        .map(
          (p) =>
            `<button type="button" aria-current="${p === page}" data-page="${p}">${p}</button>`
        )
        .join("");

      paginationEl.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          ShopState.page = Number(btn.dataset.page);
          fetchAndRenderShop();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }
  } catch (error) {
    grid.innerHTML = errorBlock(error.message);
  }
}
