const fs = require("fs");
const path = require("path");

function getBountyEscrowArtifact() {
  const artifactPath = path.resolve(
    process.cwd(),
    "..",
    "contracts",
    "artifacts",
    "contracts",
    "BountyEscrow.sol",
    "BountyEscrow.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`BountyEscrow artifact not found at ${artifactPath}. Run 'npm test' in /contracts first.`);
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(artifactPath);
}

module.exports = {
  getBountyEscrowArtifact,
};
