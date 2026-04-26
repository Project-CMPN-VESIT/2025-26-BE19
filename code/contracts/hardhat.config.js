require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: Object.assign(
    {
      hardhat: {
        chainId: 1337,
      },
    },
    process.env.SEPOLIA_RPC_URL
      ? {
          sepolia: {
            url: process.env.SEPOLIA_RPC_URL,
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
          },
        }
      : {}
  ),
};
