# Tools

## Foundry

You can verify contracts using Foundry in Hedera using [our verification service](https://github.com/hashgraph/hedera-sourcify/issues/122).
See [_How to Deploy and Verify a Hedera Smart Contract with Foundry_](https://docs.hedera.com/hedera/tutorials/smart-contracts/foundry/deploy-and-verify-smart-contract) for more information.
Our public verification service instance is located at `https://server-verify.hashscan.io`.

Once you have a running Foundry example, you can deploy and verify it with our verification service, for example

```console
forge create --rpc-url https://testnet.hashio.io/api \
  --private-key <your_private_key> src/Counter.sol:Counter \
  --verify \
  --verifier sourcify \
  --verifier-url https://server-verify.hashscan.io
```

After the contract has been verified, you can check its sources in the verification repository, for example see `https://repository-verify.hashscan.io/contracts/full_match/296/0x559e79D4Edf86E772840eFc2ee4CFC37bB500f2F/`.

If you want to use the Verifier UI with Foundry, you need to upload the source contracts and the metadata file.
See [_Verifying Smart Contracts - The Metadata File_](https://docs.hedera.com/hedera/core-concepts/smart-contracts/verifying-smart-contracts-beta#the-metadata-file) for more details.

### Running the verification service locally

Make sure you are running a local node instance and grab one of the alias ECDSA keys.

```console
hedera start -d --network local
```

Then start the local verification service

```console
npm run server:start
```

Create a new Foundry project

```console
forge init hello_foundry
cd hello_foundry
```

Deploy and verify the contract locally

```console
forge create --rpc-url http://localhost:7546 \
  --private-key <your_private_key> src/Counter.sol:Counter \
  --verify \
  --verifier sourcify \
  --verifier-url http://localhost:5555
```

## Hardhat

You can also verify contracts using Hardhat with the [`hardhat-verify`](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify#verifying-on-sourcify) plugin using our verification service.

> [!NOTE]
> There is a minor issue that might confuse users but that does not affect Sourcify verification.
> See <https://github.com/NomicFoundation/hardhat/issues/4776> for more details.

Create a new Hardhat project, install its dependencies and use the following `hardhat.config.js`

> [!TIP]
> You can use the [Hardhat starter project](./hardhat/) to work with a custom Sourcify instance.

```js
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    testnet: {
      url: 'https://testnet.hashio.io/api',
      accounts: ["<your private key, go to https://portal.hedera.com/ to setup one>"],
      chainId: 296,
    },
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://server-verify.hashscan.io",
    browserUrl: "https://repository-verify.hashscan.io",
  },
  etherscan: {
    enabled: false,
  }
};
```

> [!IMPORTANT]
> Both `apiUrl` and `browserUrl` expect an URL without a trailing slash.
> Having a trailing slash in the Sourcify URLs may cause unexpected errors.

Note that the `hardhat-verify` plugin has Etherscan enabled by default, and Sourcify disabled by default, hence you need to set both flags as above in the configuration.

Then run

```console
npx hardhat run --network testnet scripts/deploy.js
npx hardhat verify --network testnet <CONTRACT_ADDR>
```

Alternatively, to do so programmatically, invoke `hre.run` to run the required task.

```js
await hre.run('verify:sourcify', {
  address: deployedAddress,
});
```

This is useful when you intend to run verification within a [Hardhat script](https://hardhat.org/hardhat-runner/docs/advanced/scripts).

Your contract should be now verified.
