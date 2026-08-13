const Category = require("../models/Category");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// @route  GET /api/categories
// @access Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ type: 1, name: 1 });
  res.status(200).json({ success: true, count: categories.length, categories });
});

// @route  GET /api/categories/:id
// @access Public
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found.");
  res.status(200).json({ success: true, category });
});

// @route  POST /api/categories
// @access Private (admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, type, description } = req.body;
  if (!name || !type) {
    throw new ApiError(400, "Category name and type are required.");
  }
  const category = await Category.create({ name, type, description });
  res.status(201).json({ success: true, message: "Category created", category });
});

// @route  PUT /api/categories/:id
// @access Private (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new ApiError(404, "Category not found.");
  res.status(200).json({ success: true, message: "Category updated", category });
});

// @route  DELETE /api/categories/:id
// @access Private (admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const inUse = await Product.exists({ category: req.params.id });
  if (inUse) {
    throw new ApiError(
      400,
      "This category has products assigned to it and cannot be deleted."
    );
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, "Category not found.");
  res.status(200).json({ success: true, message: "Category deleted" });
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
