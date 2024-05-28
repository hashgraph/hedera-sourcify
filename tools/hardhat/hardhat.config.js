require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",

  defaultNetwork: "testnet",

  networks: {
    testnet: {
      url: 'https://testnet.hashio.io/api',
      accounts: [process.env.TESTNET_PK],
      chainId: 296,
    },
    previewnet: {
      url: 'https://previewnet.hashio.io/api',
      accounts: [process.env.PREVIEWNET_PK],
      chainId: 297,
    },
    localnet: {
      url: 'http://localhost:7546',
      accounts: [process.env.LOCALNET_PK],
      chainId: 298,
    },
  },

  etherscan: {
    enabled: false,
  },

  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
    // Optional: specify a different Sourcify server
    apiUrl: "https://server-verify.hashscan.io",
    // Optional: specify a different Sourcify repository
    browserUrl: "https://repository-verify.hashscan.io",

    // apiUrl: "https://server-sourcify.hedera-devops.com",
    // browserUrl: "https://repository-sourcify.hedera-devops.com",

    // apiUrl: "http://localhost:5555",
    // browserUrl: "http://localhost:10000",
  }
};
