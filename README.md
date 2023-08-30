<div align="center">

# Hedera Sourcify

</div>

## Overview

Tools for verifying Hedera smart contracts using standard open source libraries.

## Prerequisites

Install:
- [node](https://nodejs.org/en/about/)
- [npm](https://www.npmjs.com/)
- [Docker](https://docs.docker.com/engine/reference/commandline/docker/)

Make sure the repository submodule h5ai-nginx is present:
- `git submodule update --init --recursive`

## Local build for development

### Steps

From the root of the project workspace:

1. Run `npm ci`. This will create populate and link `node_modules`.
2. `cp environments/.env.dev.hedera  environments/.env`
3. Make sure the following variables defined in `.env` point to directories which exist on the file system: `REPOSITORY_PATH, SOLC_REPO, SOLJSON_REPO` (paths relative to the environments/ directory)
4. Run `npx lerna bootstrap && npx lerna run build`. This will build the server and ui as well as needed libraries.
5. Run `docker-compose -f environments/build-repository.yaml build`. This will build the docker image for the repository service.

### Run

* Run `docker-compose -f environments/repository.yaml up -d`. This will start repository service.
* Run `npm run server:start`. This will start the server.
* In a different terminal, run `cd ui; npm run start`. This will start and bring up the UI.

### Sanity check the configuration

This assumes the default ports (per .env.dev.hedera) are used:

* `Open http://localhost:10000`. This should open the Repository select-contract-form. The options available for the Chain should be the 3 Hedera networks (mainnet, testnet, previewnet).
* `Open http://localhost:5555/chains`. This should return a JSON value containing the 3 Hedera networks
* `Open http://localhost:5555/files/contracts/296`. This should return a JSON value containing the addresses of all contracts verified on testnet (or report error "_Contracts have not been found!_" if nothing has been verified yet)
* `Open http://localhost:3000`. This should bring up the Verifier page.

## Use Docker images

You can either use pre-built Docker images from the GitHub container repository 
or build the images locally.

### Pulling pre-built images

* You may need to authenticate to the GitHub container registry at `ghcr.io` using a personal access token [as described here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
* Run `docker pull ghcr.io/hashgraph/hedera-sourcify:ui-latest`
* Run `docker pull ghcr.io/hashgraph/hedera-sourcify:server-latest`
* Run `docker pull ghcr.io/hashgraph/hedera-sourcify:repository-latest`
* Then follow _Run_ step below.

### Build steps

1. Run `docker-compose -f environments/build-ui.yaml build`
2. Run `docker-compose -f environments/build-server.yaml build`
3. Run `docker-compose -f environments/build-repository.yaml build`

### Run

1. `cp environments/.env.docker.hedera  environments/.env`
2. Adjust the configuration in `environments/.env` as follows:
    * Replace all occurrences of `localhost` by the fully qualified hostname if not running locally
    * Use port 5555 instead of 5000 if running on a Mac
3. `cp ui/example-docker-config.json  ui/docker-config.json`
4. Adjust the URLs in `docker-config.json` as needed
5. Run `docker-compose -f environments/docker-compose-hedera.yaml up -d repository server ui`
6. `Open http://localhost:1234` to bring up the Verifier page.

### Stop

- Run `docker-compose -f environments/docker-compose-hedera.yaml down`

## Test

### Basic non-regression server test

1. Make sure the variables HEDERA_NETWORK, OPERATOR_ACCOUNT_ID and OPERATOR_KEY are defined in `environments/.env`
2. Run `hedera start --network local -d`
2. Run `npm run server:start`
3. Run `npm run test:hedera`

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