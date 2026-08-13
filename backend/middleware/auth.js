const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Protects routes that should only be accessible to authenticated admins.
 * Expects a Bearer token in the Authorization header.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Not authorized. Please log in.");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired session. Please log in again.");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, "Admin account no longer exists.");
  }

  req.user = user;
  next();
});

module.exports = { protect };
