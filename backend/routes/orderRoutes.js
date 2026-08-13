const express = require("express");
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", createOrder);
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrder);
router.put("/:id", protect, updateOrder);

module.exports = router;
