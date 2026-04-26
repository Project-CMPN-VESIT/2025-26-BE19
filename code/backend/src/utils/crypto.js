const crypto = require("crypto");

function generateNonce(length = 24) {
  return crypto.randomBytes(length).toString("hex");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

module.exports = {
  generateNonce,
  sha256Hex,
};
