const mongoose = require("mongoose");

/**
 * Connects to MongoDB Atlas using the connection string in process.env.MONGODB_URI.
 * The app will exit if the connection cannot be established, since nothing
 * in this application can function without the database.
 */
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "MONGODB_URI is not defined. Please set it in your .env file (see .env.example)."
    );
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });
}

module.exports = connectDatabase;
