/**
 * iFaruk.Stores — API utility
 * Every network call the storefront and admin panel make goes through
 * this module: FRONTEND -> REST API -> EXPRESS BACKEND -> MONGODB.
 * The frontend never talks to MongoDB directly.
 */

const API = (() => {
  // When the frontend is served by the Express server itself (npm start),
  // relative "/api" paths work automatically. If you serve the frontend
  // separately (e.g. Live Server on another port), change API_BASE_URL
  // to the full backend URL, e.g. "http://localhost:5000/api".
  const API_BASE_URL = "https://ifaruk-stores-api.onrender.com/api";
  const TOKEN_KEY = "ifaruk_admin_token";
  const ADMIN_KEY = "ifaruk_admin_profile";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, admin) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  }

  function getAdmin() {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_KEY));
    } catch (error) {
      return null;
    }
  }

  async function request(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };

    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      throw new Error(
        "Unable to reach the server. Please check your connection and try again."
      );
    }

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      // No JSON body (e.g. 204) - that's fine.
    }

    if (!response.ok) {
      const message = (data && data.message) || "Something went wrong. Please try again.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  return {
    // Products
    getProducts: (query = "") => request(`/products${query}`),
    getProduct: (id) => request(`/products/${id}`),

    uploadProductImages: async (formData) => {
      const token = getToken();
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/products/upload-images`, {
          method: "POST",
          headers,
          body: formData,
        });
      } catch (networkError) {
        throw new Error(
          "Unable to reach the server. Please check your connection and try again."
        );
      }

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {}

      if (!response.ok) {
        const message =
          (data && data.message) || "Image upload failed. Please try again.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      return data;
    },

    createProduct: (payload) => request("/products", { method: "POST", body: payload, auth: true }),
    updateProduct: (id, payload) =>
      request(`/products/${id}`, { method: "PUT", body: payload, auth: true }),
    deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE", auth: true }),

    // Categories
    getCategories: () => request("/categories"),
    createCategory: (payload) =>
      request("/categories", { method: "POST", body: payload, auth: true }),
    updateCategory: (id, payload) =>
      request(`/categories/${id}`, { method: "PUT", body: payload, auth: true }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE", auth: true }),

    // Orders
    createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
    getOrders: (query = "") => request(`/orders${query}`, { auth: true }),
    getOrder: (id) => request(`/orders/${id}`, { auth: true }),
    updateOrder: (id, payload) =>
      request(`/orders/${id}`, { method: "PUT", body: payload, auth: true }),

    // Auth
    login: (payload) => request("/auth/login", { method: "POST", body: payload }),
    logout: () => request("/auth/logout", { method: "POST", auth: true }),
    getMe: () => request("/auth/me", { auth: true }),

    // Session helpers
    getToken,
    setSession,
    clearSession,
    getAdmin,
  };
})();
