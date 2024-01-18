# Tools

## Foundry

You can verify contracts using Foundry in Hedera using our verification service.
Our verification service instance is located at `https://server-verify.hashscan.io`.

Once you have a running Foundry example, you can deploy and verify it with our verification service, for example

```console
forge create --rpc-url https://testnet.hashio.io/api \
  --private-key <your_private_key> src/Counter.sol:Counter \
  --verify \
  --verifier sourcify \
  --verifier-url https://server-verify.hashscan.io
```

After the contract has been verified, you can check its sources in the verification repository, for example see `https://repository-verify.hashscan.io/contracts/full_match/296/0x559e79D4Edf86E772840eFc2ee4CFC37bB500f2F/`.

Tracking issue <https://github.com/hashgraph/hedera-sourcify/issues/122>.

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
  --verifier-url http://localhost:5002
```
