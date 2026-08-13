/**
 * One-time script to create the first admin account from the credentials
 * in your .env file. Run with: npm run seed:admin
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const User = require("../models/User");

async function seedAdmin() {
  await connectDatabase();

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in your .env file."
    );
    process.exit(1);
  }

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`An admin with email "${ADMIN_EMAIL}" already exists. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const admin = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "superadmin",
  });

  console.log(`Admin account created successfully for ${admin.email}.`);
  console.log("You can now log in at /admin/login.html with these credentials.");

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin:", error);
  process.exit(1);
});
