const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// @route  POST /api/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signToken(user);

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    admin: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// @route  POST /api/auth/logout
// @access Private
// JWTs are stateless, so logout is handled by the client discarding the
// token. This endpoint exists for a consistent API surface and to allow
// server-side session/blacklist logic to be added later if needed.
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// @route  GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, admin: req.user });
});

module.exports = { login, logout, getMe };
