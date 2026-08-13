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
