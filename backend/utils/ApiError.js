// Small helper class so controllers can throw errors with a specific
// HTTP status code, which the central error handler then reads.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
