const multer = require("multer");
const ApiError = require("../utils/ApiError");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024, // 10 MB per image
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new ApiError(
          400,
          "Only JPG, PNG, WEBP, and AVIF images are allowed."
        )
      );
    }
    cb(null, true);
  },
});

module.exports = upload;
