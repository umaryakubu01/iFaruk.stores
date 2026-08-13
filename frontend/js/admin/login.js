/**
 * iFaruk.Stores — Admin login (login.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, skip straight to the dashboard.
  if (API.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.querySelector("[data-login-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorEl = document.querySelector("[data-login-error]");
    const submitBtn = form.querySelector('[type="submit"]');
    errorEl.textContent = "";

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      errorEl.textContent = "Please enter your email and password.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      const { token, admin } = await API.login({ email, password });
      API.setSession(token, admin);
      window.location.href = "dashboard.html";
    } catch (error) {
      errorEl.textContent = error.message || "Login failed. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
    }
  });
});
