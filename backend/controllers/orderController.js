const Order = require("../models/Order");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateOrderId = require("../utils/generateOrderId");

function buildWhatsAppMessage(order) {
  const lines = [];
  lines.push("Hello iFaruk.Stores,");
  lines.push("");
  lines.push("I would like to place an order.");
  lines.push("");
  lines.push(`Order ID: ${order.orderId}`);
  lines.push("");

  order.products.forEach((item) => {
    lines.push(item.name);
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Price: ₦${item.subtotal.toLocaleString("en-NG")}`);
    lines.push("");
  });

  lines.push(`Total: ₦${order.total.toLocaleString("en-NG")}`);
  lines.push("");
  lines.push("Customer:");
  lines.push(order.customer.fullName);
  lines.push("");
  lines.push("Phone:");
  lines.push(order.customer.phone);
  lines.push("");
  lines.push("Delivery:");
  lines.push(
    `${order.customer.deliveryLocation}, ${order.customer.city ? order.customer.city + ", " : ""}${order.customer.state}`
  );

  if (order.note) {
    lines.push("");
    lines.push("Note:");
    lines.push(order.note);
  }

  return lines.join("\n");
}

// @route  POST /api/orders
// @access Public
const createOrder = asyncHandler(async (req, res) => {
  const { customer, products, note } = req.body;

  if (!customer || !customer.fullName || !customer.phone || !customer.deliveryLocation || !customer.state) {
    throw new ApiError(400, "Full name, phone, delivery location and state are required.");
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, "Your cart is empty.");
  }

  // Re-validate every product against the database (never trust client prices/stock).
  const orderProducts = [];
  let total = 0;

  for (const item of products) {
    const dbProduct = await Product.findById(item.productId);
    if (!dbProduct) {
      throw new ApiError(400, `A product in your cart is no longer available.`);
    }
    if (item.quantity < 1) {
      throw new ApiError(400, `Invalid quantity for ${dbProduct.name}.`);
    }
    if (dbProduct.stock < item.quantity) {
      throw new ApiError(
        400,
        `Only ${dbProduct.stock} unit(s) of "${dbProduct.name}" are available.`
      );
    }

    const subtotal = dbProduct.price * item.quantity;
    total += subtotal;

    orderProducts.push({
      productId: dbProduct._id,
      name: dbProduct.name,
      price: dbProduct.price,
      quantity: item.quantity,
      subtotal,
    });
  }

  const orderId = await generateOrderId();

  const order = await Order.create({
    orderId,
    customer,
    products: orderProducts,
    total,
    note: note || "",
    status: "New",
  });

  // Safely decrement stock for each ordered product, never going below zero.
  for (const item of orderProducts) {
    await Product.updateOne(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
  }

  const whatsappMessage = buildWhatsAppMessage(order);
  const whatsappNumber = process.env.WHATSAPP_NUMBER || "";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order,
    whatsappUrl,
  });
});

// @route  GET /api/orders
// @access Private (admin)
const getOrders = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { "customer.fullName": { $regex: search, $options: "i" } },
      { "customer.phone": { $regex: search, $options: "i" } },
    ];
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: orders.length, orders });
});

// @route  GET /api/orders/:id
// @access Private (admin)
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found.");
  res.status(200).json({ success: true, order });
});

// @route  PUT /api/orders/:id
// @access Private (admin)
const updateOrder = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["New", "Contacted", "Confirmed", "Completed", "Cancelled"];
  if (status && !allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid order status.");
  }
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!order) throw new ApiError(404, "Order not found.");
  res.status(200).json({ success: true, message: "Order updated", order });
});

module.exports = { createOrder, getOrders, getOrder, updateOrder };
