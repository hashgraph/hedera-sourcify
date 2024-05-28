require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const accounts = pk => pk ? [pk] : undefined;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",

  defaultNetwork: "testnet",

  networks: {
    testnet: {
      url: 'https://testnet.hashio.io/api',
      accounts: accounts(process.env.TESTNET_PK),
      chainId: 296,
    },
    previewnet: {
      url: 'https://previewnet.hashio.io/api',
      accounts: accounts(process.env.PREVIEWNET_PK),
      chainId: 297,
    },
    localnet: {
      url: 'http://localhost:7546',
      accounts: accounts(process.env.LOCALNET_PK),
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
    apiUrl: process.env.SOURCIFY_API_URL,
    // Optional: specify a different Sourcify repository
    browserUrl: process.env.SOURCIFY_BROWSER_URL,
  }
};
