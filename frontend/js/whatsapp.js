/**
 * iFaruk.Stores — WhatsApp helper
 * whatsappChatUrl() itself is defined in config.js (shared with checkout).
 * This file wires up the generic "chat with us" CTAs found on the
 * homepage, contact page, and product pages that aren't tied to a
 * specific cart order.
 */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-whatsapp-cta]").forEach((el) => {
    const customMessage = el.getAttribute("data-whatsapp-message");
    el.href = whatsappChatUrl(customMessage || undefined);
    el.target = "_blank";
    el.rel = "noopener";
  });
});
