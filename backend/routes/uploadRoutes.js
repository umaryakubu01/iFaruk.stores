const express = require("express");
const { uploadProductImages } = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.post(
  "/product-images",
  protect,
  upload.array("images", 10),
  uploadProductImages
);

module.exports = router;
