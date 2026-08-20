/**
 * iFaruk.Stores — Admin shared behaviour
 * Included on every protected /admin page except login.html.
 * Guards the page behind a valid session and wires up logout.
 */

(async function guardAdminPage() {
  const token = API.getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const { admin } = await API.getMe();
    const nameEl = document.querySelector("[data-admin-name]");
    if (nameEl) nameEl.textContent = admin.name;
  } catch (error) {
    API.clearSession();
    window.location.href = "login.html";
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector("[data-admin-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await API.logout();
      } catch (error) {
        // Ignore - we clear the session locally regardless.
      }
      API.clearSession();
      window.location.href = "login.html";
    });
  }
});
function openConfirmModal(title, message, onConfirm) {
  const overlay = document.querySelector("[data-confirm-modal]");
  const titleEl = document.querySelector("[data-confirm-title]");
  const messageEl = document.querySelector("[data-confirm-message]");
  const yesBtn = document.querySelector("[data-confirm-yes]");
  const noBtn = document.querySelector("[data-confirm-no]");

  if (!overlay || !titleEl || !messageEl || !yesBtn || !noBtn) {
    console.error("Confirmation modal elements not found.");
    return;
  }

  titleEl.textContent = title;
  messageEl.textContent = message;

  overlay.hidden = false;
  document.body.style.overflow = "hidden";

  const closeModal = () => {
    overlay.hidden = true;
    document.body.style.overflow = "";
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  noBtn.onclick = closeModal;

  yesBtn.onclick = async () => {
    yesBtn.disabled = true;
    yesBtn.textContent = "Deleting...";

    try {
      await onConfirm();
      closeModal();
    } catch (error) {
      console.error(error);
    } finally {
      yesBtn.disabled = false;
      yesBtn.textContent = "Confirm";
    }
  };

  overlay.onclick = (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  };
}
