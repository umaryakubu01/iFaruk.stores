/**
 * iFaruk.Stores — Admin category management (categories.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-categories-table]")) return;
  initCategoriesPage();
});

function initCategoriesPage() {
  bindCategoryModal();
  document
    .querySelector("[data-add-category]")
    ?.addEventListener("click", () => openCategoryModal());
  fetchAndRenderCategories();
}

async function fetchAndRenderCategories() {
  const tableBody = document.querySelector("[data-categories-table] tbody");
  const cardsRoot = document.querySelector("[data-categories-cards]");
  tableBody.innerHTML = `<tr><td colspan="4">${loadingBlock("Loading categories...")}</td></tr>`;

  try {
    const { categories } = await API.getCategories();

    if (!categories.length) {
      tableBody.innerHTML = `<tr><td colspan="4">${emptyBlock(
        "No categories found.",
        "Create your first category to start adding products."
      )}</td></tr>`;
      if (cardsRoot) cardsRoot.innerHTML = "";
      return;
    }

    tableBody.innerHTML = categories.map(categoryRowHTML).join("");
    if (cardsRoot) cardsRoot.innerHTML = categories.map(categoryCardRowHTML).join("");
    attachCategoryRowEvents(categories);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="4">${errorBlock(error.message)}</td></tr>`;
  }
}

function categoryRowHTML(category) {
  return `
    <tr data-category-row="${category._id}">
      <td>${escapeHtml(category.name)}</td>
      <td>${category.type === "watch" ? "Luxury Watches" : "Fashion Accessories"}</td>
      <td>${escapeHtml(category.description || "—")}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-edit-category="${category._id}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete-category="${category._id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function categoryCardRowHTML(category) {
  return `
    <div class="admin-card" data-category-row="${category._id}">
      <div class="admin-card__row"><strong>${escapeHtml(category.name)}</strong></div>
      <div class="admin-card__row"><span>Type</span><span>${
        category.type === "watch" ? "Luxury Watches" : "Fashion Accessories"
      }</span></div>
      <div class="row-actions" style="margin-top:10px;">
        <button type="button" class="btn btn-secondary btn-sm" data-edit-category="${category._id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete-category="${category._id}">Delete</button>
      </div>
    </div>
  `;
}

function attachCategoryRowEvents(categories) {
  document.querySelectorAll("[data-edit-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = categories.find((c) => c._id === btn.dataset.editCategory);
      if (category) openCategoryModal(category);
    });
  });

  document.querySelectorAll("[data-delete-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openConfirmModal(
        "Delete this category?",
        "Categories with products assigned cannot be deleted.",
        async () => {
          try {
            await API.deleteCategory(btn.dataset.deleteCategory);
            showToast("Category deleted", "success");
            fetchAndRenderCategories();
          } catch (error) {
            showToast(error.message, "error");
          }
        }
      );
    });
  });
}

function bindCategoryModal() {
  const overlay = document.querySelector("[data-category-modal]");
  const closeBtn = document.querySelector("[data-close-category-modal]");
  const form = document.querySelector("[data-category-form]");

  if (closeBtn) closeBtn.addEventListener("click", closeCategoryModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCategoryModal();
    });
  }
  if (form) form.addEventListener("submit", handleCategoryFormSubmit);
}

function openCategoryModal(category = null) {
  const overlay = document.querySelector("[data-category-modal]");
  const form = document.querySelector("[data-category-form]");
  const title = document.querySelector("[data-category-modal-title]");
  form.reset();

  if (category) {
    title.textContent = "Edit Category";
    form.dataset.editingId = category._id;
    form.name.value = category.name;
    form.type.value = category.type;
    form.description.value = category.description || "";
  } else {
    title.textContent = "Add Category";
    delete form.dataset.editingId;
  }

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCategoryModal() {
  document.querySelector("[data-category-modal]").hidden = true;
  document.body.style.overflow = "";
}

async function handleCategoryFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');

  const payload = {
    name: form.name.value.trim(),
    type: form.type.value,
    description: form.description.value.trim(),
  };

  if (!payload.name || !payload.type) {
    showToast("Category name and type are required.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    if (form.dataset.editingId) {
      await API.updateCategory(form.dataset.editingId, payload);
      showToast("Category updated", "success");
    } else {
      await API.createCategory(payload);
      showToast("Category created", "success");
    }
    closeCategoryModal();
    fetchAndRenderCategories();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Category";
  }
}
