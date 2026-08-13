const { uploadBuffer } = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) {
    throw new ApiError(400, "Please select at least one image.");
  }

  if (req.files.length > 10) {
    throw new ApiError(400, "You can upload a maximum of 10 images at once.");
  }

  const invalidFile = req.files.find(
    (file) =>
      !ALLOWED_MIME_TYPES.has(file.mimetype) || file.size > MAX_FILE_SIZE
  );

  if (invalidFile) {
    const reason = !ALLOWED_MIME_TYPES.has(invalidFile.mimetype)
      ? "Only JPG, PNG, WEBP, and AVIF images are allowed."
      : "Each image must be 10MB or smaller.";
    throw new ApiError(400, reason);
  }

  const uploads = await Promise.all(
    req.files.map((file, index) =>
      uploadBuffer(file.buffer, {
        public_id: undefined,
        context: {
          source: "ifaruk-stores-admin",
          original_filename: file.originalname,
        },
        tags: ["ifaruk-stores", "product"],
      }).then((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        order: index,
        width: result.width,
        height: result.height,
        format: result.format,
      }))
    )
  );

  res.status(201).json({
    success: true,
    message: `${uploads.length} image${uploads.length === 1 ? "" : "s"} uploaded successfully.`,
    images: uploads,
  });
});

module.exports = { uploadProductImages };
