const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const cloudinary = require("../config/cloudinary");

function uploadBufferToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ifaruk-stores/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });
}


// @route  GET /api/products
// @access Public
// Supports: ?search=&category=&minPrice=&maxPrice=&availability=&sort=&featured=&newArrival=&page=&limit=
const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    availability,
    sort,
    featured,
    newArrival,
    page = 1,
    limit = 40,
  } = req.query;

  const filter = {};

  if (search) {
    filter.$text = { $search: search };
  }
  if (category) {
    filter.category = category;
  }
  if (featured === "true") {
    filter.featured = true;
  }
  if (newArrival === "true") {
    filter.newArrival = true;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (availability === "in-stock") {
    filter.stock = { $gt: 5 };
  } else if (availability === "low-stock") {
    filter.stock = { $gt: 0, $lte: 5 };
  } else if (availability === "out-of-stock") {
    filter.stock = { $lte: 0 };
  }

  let sortOption = { createdAt: -1 };
  if (sort === "price-asc") sortOption = { price: 1 };
  if (sort === "price-desc") sortOption = { price: -1 };
  if (sort === "name-asc") sortOption = { name: 1 };
  if (sort === "name-desc") sortOption = { name: -1 };
  if (sort === "newest") sortOption = { createdAt: -1 };

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug type")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    products,
  });
});

// @route  GET /api/products/:id
// @access Public
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    "category",
    "name slug type"
  );
  if (!product) throw new ApiError(404, "Product not found.");
  res.status(200).json({ success: true, product });
});

// @route  POST /api/products/upload-images
// @access Private (admin)
// Receives image files from the admin browser, uploads them to Cloudinary,
// and returns only the hosted URLs/public IDs to the frontend.
const uploadProductImages = asyncHandler(async (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new ApiError(500, "Cloudinary is not configured. Add the Cloudinary credentials to your .env file.");
  }

  if (!req.files || !req.files.length) {
    throw new ApiError(400, "Please select at least one image.");
  }

  if (req.files.length > 10) {
    throw new ApiError(400, "You can upload a maximum of 10 images at a time.");
  }

  try {
    const uploaded = await Promise.all(
      req.files.map(async (file, index) => {
        const result = await uploadBufferToCloudinary(file);
        return {
          url: result.secure_url,
          publicId: result.public_id,
          order: index,
        };
      })
    );

    res.status(201).json({
      success: true,
      message: "Images uploaded successfully.",
      images: uploaded,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new ApiError(502, "One or more images could not be uploaded. Please try again.");
  }
});

// @route  POST /api/products
// @access Private (admin)
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, message: "Product created", product });
});

// @route  PUT /api/products/:id
// @access Private (admin)
const updateProduct = asyncHandler(async (req, res) => {
  const existing = await Product.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Product not found.");

  const nextImages = Array.isArray(req.body.images) ? req.body.images : existing.images;
  const previousPublicIds = existing.images.map((image) => image.publicId).filter(Boolean);
  const nextPublicIds = nextImages.map((image) => image.publicId).filter(Boolean);
  const removedPublicIds = previousPublicIds.filter((id) => !nextPublicIds.includes(id));

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { ...req.body, images: nextImages },
    {
      new: true,
      runValidators: true,
    }
  );

  // Remove images deleted from the product from Cloudinary as well.
  if (removedPublicIds.length && process.env.CLOUDINARY_API_SECRET) {
    await Promise.allSettled(
      removedPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
    );
  }

  res.status(200).json({ success: true, message: "Product updated", product });
});

// @route  DELETE /api/products/:id
// @access Private (admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");

  const publicIds = product.images.map((image) => image.publicId).filter(Boolean);
  if (publicIds.length && process.env.CLOUDINARY_API_SECRET) {
    await Promise.allSettled(
      publicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
    );
  }

  res.status(200).json({ success: true, message: "Product deleted" });
});

module.exports = {
  getProducts,
  getProduct,
  uploadProductImages,
  createProduct,
  updateProduct,
  deleteProduct,
};
