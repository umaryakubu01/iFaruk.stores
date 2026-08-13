const express = require("express");
const {
  getProducts,
  getProduct,
  uploadProductImages,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/upload-images", protect, upload.array("images", 10), uploadProductImages);
router.post("/", protect, createProduct);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;
