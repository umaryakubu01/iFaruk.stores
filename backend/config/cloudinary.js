const { v2: cloudinary } = require("cloudinary");

const required = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(
    `Cloudinary is not configured. Missing: ${missing.join(", ")}. ` +
      "Image uploads will fail until these values are added to .env."
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
