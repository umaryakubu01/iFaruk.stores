/**
 * iFaruk.Stores — Admin product management (products.html)
 */

let categoriesCache = [];

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-products-table]")) return;
  initProductsPage();
});

async function initProductsPage() {
  await loadCategoriesForForm();
  bindProductToolbar();
  bindProductModal();
  fetchAndRenderProducts();
}

async function loadCategoriesForForm() {
  try {
    const { categories } = await API.getCategories();
    categoriesCache = categories;

    const filterSelect = document.querySelector("[data-filter-category]");
    const formSelect = document.querySelector("#product-category");
    const options = categories
      .map((c) => `<option value="${c._id}">${escapeHtml(c.name)}</option>`)
      .join("");

    if (filterSelect) filterSelect.innerHTML = `<option value="">All Categories</option>${options}`;
    if (formSelect) formSelect.innerHTML = `<option value="">Select a category</option>${options}`;
  } catch (error) {
    showToast("Could not load categories.", "error");
  }
}

function bindProductToolbar() {
  const searchInput = document.querySelector("[data-product-search]");
  const filterSelect = document.querySelector("[data-filter-category]");
  const addBtn = document.querySelector("[data-add-product]");

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAndRenderProducts, 350);
    });
  }
  if (filterSelect) filterSelect.addEventListener("change", fetchAndRenderProducts);
  if (addBtn) addBtn.addEventListener("click", () => openProductModal());
}

function buildAdminProductQuery() {
  const params = new URLSearchParams();
  const search = document.querySelector("[data-product-search]")?.value.trim();
  const category = document.querySelector("[data-filter-category]")?.value;
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  params.set("limit", 100);
  return `?${params.toString()}`;
}

async function fetchAndRenderProducts() {
  const tableBody = document.querySelector("[data-products-table] tbody");
  const cardsRoot = document.querySelector("[data-products-cards]");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7">${loadingBlock("Loading products...")}</td></tr>`;

  try {
    const { products } = await API.getProducts(buildAdminProductQuery());

    if (!products.length) {
      tableBody.innerHTML = `<tr><td colspan="7">${emptyBlock(
        "No products found.",
        "Add your first product to get started."
      )}</td></tr>`;
      if (cardsRoot) cardsRoot.innerHTML = "";
      return;
    }

    tableBody.innerHTML = products.map(productRowHTML).join("");
    if (cardsRoot) cardsRoot.innerHTML = products.map(productCardRowHTML).join("");

    attachProductRowEvents(products);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="7">${errorBlock(error.message)}</td></tr>`;
  }
}

function productRowHTML(product) {
  const image = productImageUrl(product);
  return `
    <tr data-product-row="${product._id}">
      <td><img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" onerror="this.style.visibility='hidden'"></td>
      <td>${escapeHtml(product.name)}${product.featured ? " ⭐" : ""}${
    product.newArrival ? " 🆕" : ""
  }</td>
      <td>${escapeHtml((product.category && product.category.name) || "—")}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>${product.stock}</td>
      <td>${availabilityBadge(product.stock)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-edit-product="${product._id}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete-product="${product._id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function productCardRowHTML(product) {
  return `
    <div class="admin-card" data-product-row="${product._id}">
      <div class="admin-card__row"><strong>${escapeHtml(product.name)}</strong> ${availabilityBadge(
    product.stock
  )}</div>
      <div class="admin-card__row"><span>Category</span><span>${escapeHtml(
        (product.category && product.category.name) || "—"
      )}</span></div>
      <div class="admin-card__row"><span>Price</span><span>${formatCurrency(product.price)}</span></div>
      <div class="admin-card__row"><span>Stock</span><span>${product.stock}</span></div>
      <div class="row-actions" style="margin-top:10px;">
        <button type="button" class="btn btn-secondary btn-sm" data-edit-product="${product._id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete-product="${product._id}">Delete</button>
      </div>
    </div>
  `;
}

function attachProductRowEvents(products) {
  document.querySelectorAll("[data-edit-product]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((p) => p._id === btn.dataset.editProduct);
      if (product) openProductModal(product);
    });
  });

  document.querySelectorAll("[data-delete-product]").forEach((btn) => {
    btn.addEventListener("click", () => confirmDeleteProduct(btn.dataset.deleteProduct));
  });
}

function confirmDeleteProduct(id) {
  openConfirmModal(
    "Delete this product?",
    "This action cannot be undone.",
    async () => {
      try {
        await API.deleteProduct(id);
        showToast("Product deleted", "success");
        fetchAndRenderProducts();
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  );
}

/* ---------------------------------------------------------------- */
/* Product create/edit modal                                         */
/* ---------------------------------------------------------------- */
let selectedImageFiles = [];
let existingProductImages = [];

function bindProductModal() {
  const closeBtn = document.querySelector("[data-close-product-modal]");
  const overlay = document.querySelector("[data-product-modal]");
  const form = document.querySelector("[data-product-form]");
  const fileInput = document.querySelector("#product-images");
  const picker = document.querySelector("[data-image-picker]");
  const uploadBox = document.querySelector("[data-image-upload-box]");

  if (closeBtn) closeBtn.addEventListener("click", closeProductModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeProductModal();
    });
  }

  if (picker && fileInput) {
    picker.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      addSelectedImageFiles(Array.from(event.target.files || []));
      fileInput.value = "";
    });
  }

  if (uploadBox) {
    ["dragenter", "dragover"].forEach((eventName) => {
      uploadBox.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadBox.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      uploadBox.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadBox.classList.remove("is-dragging");
      });
    });

    uploadBox.addEventListener("drop", (event) => {
      addSelectedImageFiles(Array.from(event.dataTransfer.files || []));
    });
  }

  if (form) form.addEventListener("submit", handleProductFormSubmit);
}

function openProductModal(product = null) {
  const overlay = document.querySelector("[data-product-modal]");
  const form = document.querySelector("[data-product-form]");
  const title = document.querySelector("[data-product-modal-title]");

  form.reset();
  selectedImageFiles = [];
  existingProductImages = [];
  renderImagePreviews();

  if (product) {
    title.textContent = "Edit Product";
    form.dataset.editingId = product._id;
    form.name.value = product.name;
    form.description.value = product.description;
    form.price.value = product.price;
    form.stock.value = product.stock;
    form.category.value = (product.category && product.category._id) || "";
    form.variants.value = (product.variants || []).join(", ");
    form.colors.value = (product.colors || []).join(", ");
    form.featured.checked = Boolean(product.featured);
    form.newArrival.checked = Boolean(product.newArrival);
    form.specifications.value = product.specifications
      ? Object.entries(product.specifications)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";

    existingProductImages = (product.images || []).map((image, index) => ({
      url: image.url,
      publicId: image.publicId || "",
      order: typeof image.order === "number" ? image.order : index,
    }));
    renderImagePreviews();
  } else {
    title.textContent = "Add Product";
    delete form.dataset.editingId;
  }

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  document.querySelector("[data-product-modal]").hidden = true;
  document.body.style.overflow = "";
  selectedImageFiles = [];
  existingProductImages = [];
  renderImagePreviews();
}

function addSelectedImageFiles(files) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  const maxFiles = 10;
  const maxSize = 10 * 1024 * 1024;

  const validFiles = [];
  const rejected = [];

  files.forEach((file) => {
    if (!allowed.has(file.type)) {
      rejected.push(`${file.name}: unsupported format`);
      return;
    }
    if (file.size > maxSize) {
      rejected.push(`${file.name}: larger than 10 MB`);
      return;
    }
    validFiles.push(file);
  });

  const availableSlots = maxFiles - existingProductImages.length - selectedImageFiles.length;
  if (validFiles.length > availableSlots) {
    rejected.push(`Only ${Math.max(availableSlots, 0)} more image(s) can be added.`);
    validFiles.splice(Math.max(availableSlots, 0));
  }

  selectedImageFiles.push(...validFiles);
  renderImagePreviews();

  if (rejected.length) {
    showToast(rejected.slice(0, 2).join(" • "), "error");
  }
}

function renderImagePreviews() {
  const grid = document.querySelector("[data-image-preview-grid]");
  if (!grid) return;

  grid.innerHTML = "";

  existingProductImages.forEach((image, index) => {
    const card = document.createElement("div");
    card.className = "image-preview-card";
    card.innerHTML = `
      <img src="${escapeHtml(image.url)}" alt="Existing product image ${index + 1}">
      <button type="button" class="image-preview-card__remove" aria-label="Remove image">&times;</button>
      <span class="image-preview-card__label">${index === 0 ? "Main image" : `Image ${index + 1}`}</span>
    `;
    card.querySelector("button").addEventListener("click", () => {
      existingProductImages.splice(index, 1);
      renderImagePreviews();
    });
    grid.appendChild(card);
  });

  selectedImageFiles.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "image-preview-card image-preview-card--new";
    const image = document.createElement("img");
    image.alt = `New product image ${index + 1}`;
    image.src = URL.createObjectURL(file);
    image.onload = () => URL.revokeObjectURL(image.src);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "image-preview-card__remove";
    remove.setAttribute("aria-label", "Remove selected image");
    remove.innerHTML = "&times;";
    remove.addEventListener("click", () => {
      selectedImageFiles.splice(index, 1);
      renderImagePreviews();
    });

    const label = document.createElement("span");
    label.className = "image-preview-card__label";
    label.textContent =
      existingProductImages.length === 0 && index === 0
        ? "Main image"
        : `New image ${index + 1}`;

    card.append(image, remove, label);
    grid.appendChild(card);
  });
}

async function uploadSelectedImages() {
  if (!selectedImageFiles.length) return [];

  const formData = new FormData();
  selectedImageFiles.forEach((file) => formData.append("images", file));

  const result = await API.uploadProductImages(formData);
  return result.images || [];
}

function parseSpecifications(text) {
  const specs = {};
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        specs[key.trim()] = rest.join(":").trim();
      }
    });
  return specs;
}

async function handleProductFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');

  const totalImages = existingProductImages.length + selectedImageFiles.length;
  if (totalImages > 10) {
    showToast("A product can have a maximum of 10 images.", "error");
    return;
  }

  const payload = {
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    price: Number(form.price.value),
    stock: Number(form.stock.value),
    category: form.category.value,
    variants: form.variants.value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    colors: form.colors.value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    specifications: parseSpecifications(form.specifications.value),
    featured: form.featured.checked,
    newArrival: form.newArrival.checked,
  };

  if (!payload.name || !payload.description || !payload.category || !payload.price) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = selectedImageFiles.length ? "Uploading images..." : "Saving...";

  try {
    const uploadedImages = await uploadSelectedImages();

    payload.images = [
      ...existingProductImages.map((image, index) => ({
        url: image.url,
        publicId: image.publicId || "",
        order: index,
      })),
      ...uploadedImages.map((image, index) => ({
        url: image.url,
        publicId: image.publicId || "",
        order: existingProductImages.length + index,
      })),
    ];

    submitBtn.textContent = "Saving...";

    if (form.dataset.editingId) {
      await API.updateProduct(form.dataset.editingId, payload);
      showToast("Product updated", "success");
    } else {
      await API.createProduct(payload);
      showToast("Product created", "success");
    }

    closeProductModal();
    fetchAndRenderProducts();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Product";
  }
}

/* ---------------------------------------------------------------- */
/* Generic confirm modal (shared with categories/orders pages)       */
/* ---------------------------------------------------------------- */
function openConfirmModal(title, message, onConfirm) {
  const overlay = document.querySelector("[data-confirm-modal]");
  if (!overlay) {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  overlay.querySelector("[data-confirm-title]").textContent = title;
  overlay.querySelector("[data-confirm-message]").textContent = message;
  overlay.hidden = false;

  const confirmBtn = overlay.querySelector("[data-confirm-yes]");
  const cancelBtn = overlay.querySelector("[data-confirm-no]");

  const cleanup = () => {
    overlay.hidden = true;
    confirmBtn.removeEventListener("click", onYes);
    cancelBtn.removeEventListener("click", onNo);
  };
  const onYes = () => {
    cleanup();
    onConfirm();
  };
  const onNo = () => cleanup();

  confirmBtn.addEventListener("click", onYes);
  cancelBtn.addEventListener("click", onNo);
}
