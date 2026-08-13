/**
 * iFaruk.Stores — Product detail page (product.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-product-detail]");
  if (!root) return;
  initProductDetailPage(root);
});

async function initProductDetailPage(root) {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    root.innerHTML = errorBlock("No product was specified.");
    return;
  }

  root.innerHTML = loadingBlock("Loading product...");

  let product;
  try {
    const response = await API.getProduct(productId);
    product = response.product;
  } catch (error) {
    root.innerHTML = errorBlock(error.message || "This product could not be found.");
    return;
  }

  renderProductDetail(root, product);
  loadRelatedProducts(product);
}

function renderProductDetail(root, product) {
  document.title = `${product.name} — iFaruk.Stores`;

  const images = product.images && product.images.length ? product.images : [{ url: "" }];
  const specs = product.specifications ? Object.entries(product.specifications) : [];
  const outOfStock = product.stock <= 0;

  root.innerHTML = `
    <div class="product-detail">
      <div class="gallery">
        <div class="gallery__main">
          <img data-gallery-main src="${escapeHtml(images[0].url)}" alt="${escapeHtml(product.name)}">
        </div>
        ${
          images.length > 1
            ? `<div class="gallery__thumbs">
                ${images
                  .map(
                    (img, i) => `
                  <button type="button" data-gallery-thumb="${i}" class="${i === 0 ? "is-active" : ""}">
                    <img src="${escapeHtml(img.url)}" alt="${escapeHtml(product.name)} view ${i + 1}">
                  </button>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>

      <div class="product-info">
        <span class="product-info__category">${escapeHtml(
          (product.category && product.category.name) || ""
        )}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="product-info__price">${formatCurrency(product.price)}</p>
        ${availabilityBadge(product.stock)}
        <p class="product-info__desc" style="margin-top:20px;">${escapeHtml(product.description)}</p>

        ${
          product.colors && product.colors.length
            ? `<div class="variant-group">
                <h4>Color</h4>
                <div class="variant-options" data-color-options>
                  ${product.colors
                    .map(
                      (c, i) =>
                        `<button type="button" class="variant-chip ${
                          i === 0 ? "is-active" : ""
                        }" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`
                    )
                    .join("")}
                </div>
              </div>`
            : ""
        }

        ${
          product.variants && product.variants.length
            ? `<div class="variant-group">
                <h4>Variant</h4>
                <div class="variant-options" data-variant-options>
                  ${product.variants
                    .map(
                      (v, i) =>
                        `<button type="button" class="variant-chip ${
                          i === 0 ? "is-active" : ""
                        }" data-variant="${escapeHtml(v)}">${escapeHtml(v)}</button>`
                    )
                    .join("")}
                </div>
              </div>`
            : ""
        }

        <div class="product-info__actions">
          <div class="qty-stepper">
            <button type="button" aria-label="Decrease quantity" data-detail-qty-decrease>&minus;</button>
            <input type="number" min="1" max="${product.stock}" value="1" aria-label="Quantity" data-detail-qty-input>
            <button type="button" aria-label="Increase quantity" data-detail-qty-increase>&plus;</button>
          </div>
          <button type="button" class="btn btn-primary" data-add-to-cart ${
            outOfStock ? "disabled" : ""
          }>${outOfStock ? "Out of Stock" : "Add to Cart"}</button>
          <a href="${whatsappChatUrl(
            `Hello iFaruk.Stores, I'm interested in the ${product.name} (${formatCurrency(
              product.price
            )}). Is it available?`
          )}" target="_blank" rel="noopener" class="btn btn-whatsapp">Order via WhatsApp</a>
        </div>

        ${
          specs.length
            ? `<table class="spec-table">
                ${specs
                  .map(
                    ([key, value]) =>
                      `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`
                  )
                  .join("")}
              </table>`
            : ""
        }
      </div>
    </div>
  `;

  attachProductDetailEvents(product);
}

function attachProductDetailEvents(product) {
  const mainImage = document.querySelector("[data-gallery-main]");
  document.querySelectorAll("[data-gallery-thumb]").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const index = Number(thumb.dataset.galleryThumb);
      mainImage.src = product.images[index].url;
      document
        .querySelectorAll("[data-gallery-thumb]")
        .forEach((t) => t.classList.remove("is-active"));
      thumb.classList.add("is-active");
    });
  });

  document.querySelectorAll("[data-color-options] .variant-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll("[data-color-options] .variant-chip")
        .forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
    });
  });

  document.querySelectorAll("[data-variant-options] .variant-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll("[data-variant-options] .variant-chip")
        .forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
    });
  });

  const qtyInput = document.querySelector("[data-detail-qty-input]");
  document.querySelector("[data-detail-qty-decrease]").addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  document.querySelector("[data-detail-qty-increase]").addEventListener("click", () => {
    qtyInput.value = Math.min(product.stock, Number(qtyInput.value) + 1);
  });

  const addBtn = document.querySelector("[data-add-to-cart]");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const quantity = Math.min(Number(qtyInput.value) || 1, product.stock);
      Cart.addItem(product, quantity, product.stock);
      updateCartBadge();
      showToast(`${product.name} added to cart`, "success");
    });
  }
}

async function loadRelatedProducts(product) {
  const root = document.querySelector("[data-related-products]");
  if (!root || !product.category) return;

  const categoryId = product.category._id || product.category;

  try {
    const { products } = await API.getProducts(`?category=${categoryId}&limit=4`);
    const related = products.filter((p) => p._id !== product._id).slice(0, 4);

    if (!related.length) {
      root.closest("section").style.display = "none";
      return;
    }

    root.innerHTML = related.map(productCardHTML).join("");
    attachQuickAddEvents(root, related);
  } catch (error) {
    root.closest("section").style.display = "none";
  }
}
