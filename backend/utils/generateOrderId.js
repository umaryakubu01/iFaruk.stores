const Order = require("../models/Order");

/**
 * Generates a sequential, human-friendly order id such as IFK-1001.
 * Falls back to a timestamp-based id if the counting query ever fails.
 */
async function generateOrderId() {
  try {
    const count = await Order.countDocuments();
    return `IFK-${1000 + count + 1}`;
  } catch (error) {
    return `IFK-${Date.now()}`;
  }
}

module.exports = generateOrderId;
