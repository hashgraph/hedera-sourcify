<div align="center">

# Hedera Sourcify

</div>

## Overview

Tools for verifying Hedera smart contracts using standard open source libraries.

## Build

### Prerequisites

Install:
- [node](https://nodejs.org/en/about/)
- [npm](https://www.npmjs.com/)
- [Docker](https://docs.docker.com/engine/reference/commandline/docker/)

### Steps

From the root of the project workspace:

1. Run `npm ci`. This will create populate and link `node_modules`.
2. `cp environments/.env.dev.hedera  environments/.env`
3. Make sure the following variables defined in `.env` point to directories which exist on the file system: `REPOSITORY_PATH, SOLC_REPO, SOLJSON_REPO`
4. Run `npx lerna bootstrap && npx lerna run build`. This will build the server and ui as well as needed libraries.
5. Run `docker-compose -f environments/docker-compose-hedera.yaml build repository`. This will build the docker image for the repository service.

## Run

6. Run `docker-compose -f environments/docker-compose-hedera.yaml up -d repository`. This will start repository service. 
7. Run `npm run server:start`. This will start the server.
7. In a different terminal, run `cd ui; npm run start`. This will start and bring up the UI.

## Sanity check the configuration

This assumes the default ports (per .env.dev.hedera) are used:

1. `Open http://localhost:10000`. This should open the Repository select-contract-form. The options available for the Chain should be the 3 Hedera networks (mainnet, testnet, previewnet).
2. `Open http://localhost:5555/files/contracts/296`. This should return a JSON value containing the addresses of all contracts verified on testnet.
3. `Open http://localhost:3000`. This should bring up the Verifier page.

## Support

If you have a question on how to use the product, please see our
[support guide](https://github.com/hashgraph/.github/blob/main/SUPPORT.md).

## Contributing

Contributions are welcome. Please see the
[contributing guide](https://github.com/hashgraph/.github/blob/main/CONTRIBUTING.md)
to see how you can get involved.

## Code of Conduct

This project is governed by the
[Contributor Covenant Code of Conduct](https://github.com/hashgraph/.github/blob/main/CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code of conduct. Please report unacceptable behavior
to [oss@hedera.com](mailto:oss@hedera.com).

## License

[TBD](LICENSE)