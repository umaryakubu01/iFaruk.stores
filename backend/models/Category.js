const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // "watch" or "accessory" - lets the storefront group categories under
    // "Luxury Watches" or "Fashion Accessories" on the homepage/shop filters.
    type: {
      type: String,
      enum: ["watch", "accessory"],
      required: [true, "Category type is required"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function generateSlug(next) {
  if (this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

module.exports = mongoose.model("Category", categorySchema);
