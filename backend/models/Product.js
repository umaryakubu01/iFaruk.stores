const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    // Cloud image URLs (e.g. Cloudinary/S3) - never base64 data.
    images: {
      type: [imageSchema],
      default: [],
    },
    specifications: {
      // Flexible key/value pairs, e.g. { "Case Material": "Stainless Steel" }
      type: Map,
      of: String,
      default: {},
    },
    variants: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    newArrival: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.pre("validate", function generateSlug(next) {
  if (this.name) {
    this.slug =
      this.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 7);
  }
  next();
});

// Virtual availability label used by the frontend.
productSchema.virtual("availability").get(function availability() {
  if (this.stock <= 0) return "Out of Stock";
  if (this.stock <= 5) return "Low Stock";
  return "In Stock";
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
