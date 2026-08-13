/**
 * iFaruk.Stores — Frontend configuration
 * Public, non-sensitive display settings only. Never put secrets here.
 * Keep WHATSAPP_NUMBER in sync with WHATSAPP_NUMBER in your backend .env
 * file (used for the general "chat with us" floating button; the
 * checkout flow itself asks the backend for the authoritative link).
 */
const SITE_CONFIG = {
  WHATSAPP_NUMBER: "2347040699737", // international format, digits only
  CURRENCY_SYMBOL: "₦",
  BRAND_NAME: "iFaruk.Stores",
};

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return `${SITE_CONFIG.CURRENCY_SYMBOL}${value.toLocaleString("en-NG")}`;
}

function whatsappChatUrl(message) {
  const text = message || "Hello iFaruk.Stores, I'd like to know more about your collection.";
  return `https://wa.me/${SITE_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
