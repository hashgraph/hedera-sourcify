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

Apply the Hedera patch to the `h5ai-nginx` submodule (execute this only once).
- `./scripts/hedera-apply-patch.sh`

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

### Set-up

1. `cp environments/.env.docker.hedera  environments/.env`
2. Adjust the configuration in `environments/.env` as follows:
    * Replace all occurrences of `localhost` by the fully qualified hostname if not running locally
3. `cp environments/example-docker-config.json  environments/docker-config.json`
    * Adjust the URLs in `docker-config.json` as needed
4. You may need to authenticate to the GitHub container registry at `ghcr.io` using a personal access token [as described here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

### Pulling pre-built images

* Run `docker pull ghcr.io/hashgraph/hedera-sourcify:ui-latest`
* Run `docker pull ghcr.io/hashgraph/hedera-sourcify:server-latest`
* Run `docker pull ghcr.io/hashgraph/hedera-sourcify:repository-latest`
* Then follow _Run_ step below.

### Build images

1. Run `docker-compose -f environments/build-ui.yaml build`
2. Run `docker-compose -f environments/build-server.yaml build`
3. Run `docker-compose -f environments/build-repository.yaml build`

### Run

1. Run `docker-compose -f environments/docker-compose-hedera.yaml up -d repository server ui`
2. `Open http://localhost:1234` to bring up the Verifier page.

### Stop

- Run `docker-compose -f environments/docker-compose-hedera.yaml down`

## Test

### Basic non-regression server test

1. Make sure the variables HEDERA_NETWORK, OPERATOR_ACCOUNT_ID and OPERATOR_KEY are defined in `environments/.env`
2. Run `hedera start --network local -d`
3. Run `npm run server:start`
4. Run `npm run test:hedera`

## Configuration

The following tables describe the configuration items used by the different services

### _ui_ module

The _ui_ service is a single page application based on React. As such, it cannot be configured by environment variables at runtime.
It reads it configuration from a file located at the following path: `/usr/share/nginx/html/config.json`
In deployment, the actual configuration can be provided to the container via a mount point.

Example contents for `config.json`:

```config.json
{
    "SERVER_URL": "https://server.sourcify-integration.hedera-devops.com",
    "REPOSITORY_SERVER_URL": "https://repository.sourcify-integration.hedera-devops.com",
    "EXPLORER_URL": "http://localhost:8080",
    "REMOTE_IMPORT": false,
    "GITHUB_IMPORT": false,
    "CONTRACT_IMPORT": false,
    "JSON_IMPORT": false,
    "OPEN_IN_REMIX": false
}
```
The following properties can be provided in config.json

| Name                    | Description                                                                  |
|-------------------------|------------------------------------------------------------------------------|
| `SERVER_URL`            | URL of the server (from outside the cluster).                                |
| `REPOSITORY_SERVER_URL` | HTTP port exposed by container                                               |
| `EXPLORER_URL`          | URL of the mirror-node explorer                                              |
| `REMOTE_IMPORT`         | Flag to activate mode "Import from remote"                                   |
| `GITHUB_IMPORT`         | Flag to activate mode "Import from GitHub"                                   |                                 
| `CONTRACT_IMPORT`       | Flag to activate mode "Import from contract's metadata"                      |                                           
| `JSON_IMPORT`           | Flag to activate mode "Import contracts from Solidity's Standard JSON Input" |                                            
| `OPEN_IN_REMIX`         | Flag to activate link "Open in Remix"                                        |

### _server_ module

The following environment variables are needed by the _server_ at runtime:

| Name                    | Example value                                             | Description                                                                             |
|-------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `REPOSITORY_PATH`       | ../../data/repository                                     | DO NOT CHANGE - Path of the contract repository, both inside container and on the host. |
| `SOLC_REPO`             | /home/data/solc-bin/linux-amd64                           | Path where Solidity compiler binaries will be saved (inside container)                  |
| `SOLJSON_REPO`          | /home/data/solc-bin/soljson                               | Path where Solidity JS compilers will be saved (inside container)                       |
| `SOLC_REPO_HOST`        | ../../data/solc-bin/linux-amd64                           | Path for the Solidity compiler binaries downloaded (on host machine)                    |
| `SOLJSON_REPO_HOST`     | ../../data/solc-bin/soljson                               | Path for the Solidity JS compilers downloaded (on host machine)                         |
| `SERVER_PORT`           | 80                                                        | HTTP port used inside container                                                         |
| `SERVER_EXTERNAL_PORT`  | 5002                                                      | HTTP port exposed by container                                                          |
| `UI_DOMAIN_NAME`        | sourcify-integration.hedera-devops.com                    | Fully qualified domain name of the host running the ui                                  |
| `REPOSITORY_SERVER_URL` | https://repository.sourcify-integration.hedera-devops.com | URL of repository server (from outside the cluster)                                     |
| `TESTING`               | false                                                     | DO NOT CHANGE                                                                           |
| `TAG`                   | latest                                                    | DO NOT CHANGE                                                                           |

### _repository_ module

The _repository_ service encompasses a single page application based on React and a web server.

- Similar to the _ui_, the React part reads it configuration from a file located at the following path: `/redirects/config.json`
In deployment, the actual configuration can be provided to the container via the same mount point as the one provided to the _ui_, 
even though the only useful item for the _repository_ is the following:
`"SERVER_URL": "https://server.sourcify-integration.hedera-devops.com"` value

- The web server part needs the following environment variables at runtime:

| Name                              | Example value                          | Description                                            |
|-----------------------------------|----------------------------------------|--------------------------------------------------------|
| `REPOSITORY_PATH`                 | ../../data/repository                  | Path of the contract repository on the host.           |
| `REPOSITORY_SERVER_EXTERNAL_PORT` | 10000                                  | HTTP port exposed by container                         |
| `UI_DOMAIN_NAME`                  | sourcify-integration.hedera-devops.com | Fully qualified domain name of the host running the ui |
| `TESTING`                         | false                                  | DO NOT CHANGE                                          |
| `TAG`                             | latest                                 | DO NOT CHANGE                                          |

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