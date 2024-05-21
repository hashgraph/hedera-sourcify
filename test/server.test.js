const Server = require("../sourcify/services/server/dist/server/server").Server;
const server = new Server();

const config = require("config");

const {
  assertValidationError,
  assertVerification,
  assertVerificationSession,
  assertLookup,
  invalidAddress,
  assertLookupAll,
  assertContractSaved,
  assertContractNotSaved,
} = require("./helpers/assertions");
const ganache = require("ganache");
const chai = require("chai");
const chaiHttp = require("chai-http");
const util = require("util");
const fs = require("fs");
const rimraf = require("rimraf");
const path = require("path");

const StatusCodes = require("http-status-codes").StatusCodes;
const {
  waitSecs,
  callContractMethodWithTx,
  deployFromAbiAndBytecodeForCreatorTxHash,
} = require("./helpers/helpers");
const { deployFromAbiAndBytecode } = require("./helpers/helpers");
const { JsonRpcProvider } = require("ethers");
chai.use(chaiHttp);

const CHAIN_ID = "1337";

describe("Server", function () {
  this.timeout(20000);

  const ganacheServer = ganache.server({
    wallet: { totalAccounts: 1 },
    chain: {
      chainId: parseInt(CHAIN_ID),
      networkId: parseInt(CHAIN_ID),
    },
  });

  let localSigner;
  let defaultContractAddress;
  let currentResponse = null; // to log server response when test fails

  const sourcePath = path.join(
    "test",
    "testcontracts",
    "Storage",
    "Storage.sol"
  );
  const sourceBuffer = fs.readFileSync(sourcePath);

  const artifact = require("./testcontracts/Storage/Storage.json");
  const metadata = require("./testcontracts/Storage/metadata.json");
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));

  before(async () => {
    const GANACHE_PORT = 8545;

    await ganacheServer.listen(GANACHE_PORT);
    console.log("Started ganache local server on port " + GANACHE_PORT);
    localSigner = await new JsonRpcProvider(`http://localhost:${GANACHE_PORT}`).getSigner();
    console.log("Initialized Provider");

    // Deploy the test contract
    defaultContractAddress = await deployFromAbiAndBytecode(
      localSigner,
      artifact.abi,
      artifact.bytecode
    );

    const promisified = util.promisify(server.app.listen);
    await promisified(server.port);
    console.log(`Server listening on port ${server.port}!`);
  });

  beforeEach(() => {
    rimraf.sync(server.repository);
  });

  after(async () => {
    rimraf.sync(server.repository);
    await ganacheServer.close();
  });

  // log server response when test fails
  afterEach(function () {
    const errorBody = currentResponse && currentResponse.body;
    if (this.currentTest.state === "failed" && errorBody) {
      console.log(
        "Server response of failed test " + this.currentTest.title + ":"
      );
      console.log(errorBody);
    }
    currentResponse = null;
  });

  describe("/check-by-addresses", function () {

    it("should fail for missing chainIds", (done) => {
      chai
        .request(server.app)
        .get("/check-by-addresses")
        .query({ addresses: defaultContractAddress })
        .end((err, res) => {
          assertValidationError(err, res, "chainIds");
          done();
        });
    });

    it("should fail for missing addresses", (done) => {
      chai
        .request(server.app)
        .get("/check-by-addresses")
        .query({ chainIds: CHAIN_ID })
        .end((err, res) => {
          assertValidationError(err, res, "addresses");
          done();
        });
    });

    it("should return false for previously unverified contract", (done) => {
      chai
        .request(server.app)
        .get("/check-by-addresses")
        .query({
          chainIds: CHAIN_ID,
          addresses: defaultContractAddress,
        })
        .end((err, res) => {
          assertLookup(err, res, defaultContractAddress, "false");
          done();
        });
    });

    it("should fail for invalid address", (done) => {
      chai
        .request(server.app)
        .get("/check-by-addresses")
        .query({ chainIds: CHAIN_ID, addresses: invalidAddress })
        .end((err, res) => {
          assertValidationError(err, res, "addresses");
          done();
        });
    });

    it("should return false for unverified contract but then perfect after verification", (done) => {
      chai
        .request(server.app)
        .get("/check-by-addresses")
        .query({
          chainIds: CHAIN_ID,
          addresses: defaultContractAddress,
        })
        .end((err, res) => {
          assertLookup(err, res, defaultContractAddress, "false");
          chai
            .request(server.app)
            .post("/")
            .field("address", defaultContractAddress)
            .field("chain", CHAIN_ID)
            .attach("files", metadataBuffer, "metadata.json")
            .attach("files", sourceBuffer)
            .end((err, res) => {
              chai.expect(err).to.be.null;
              // console.log(res);
              chai.expect(res.status).to.equal(StatusCodes.OK);

              chai
                .request(server.app)
                .get("/check-by-addresses")
                .query({
                  chainIds: CHAIN_ID,
                  addresses: defaultContractAddress,
                })
                .end((err, res) =>
                  assertLookup(
                    err,
                    res,
                    defaultContractAddress,
                    "perfect",
                    done
                  )
                );
            });
        });
    });

    it("should convert addresses to checksummed format", (done) => {
      chai
        .request(server.app)
        .get("/check-by-addresses")
        .query({
          chainIds: CHAIN_ID,
          addresses: defaultContractAddress.toLowerCase(),
        })
        .end((err, res) => {
          assertLookup(err, res, defaultContractAddress, "false", done);
        });
    });
  });

  describe("/check-all-by-addresses", function () {

    it("should fail for missing chainIds", (done) => {
      chai
        .request(server.app)
        .get("/check-all-by-addresses")
        .query({ addresses: defaultContractAddress })
        .end((err, res) => {
          assertValidationError(err, res, "chainIds");
          done();
        });
    });

    it("should fail for missing addresses", (done) => {
      chai
        .request(server.app)
        .get("/check-all-by-addresses")
        .query({ chainIds: CHAIN_ID })
        .end((err, res) => {
          assertValidationError(err, res, "addresses");
          done();
        });
    });

    it("should return false for previously unverified contract", (done) => {
      chai
        .request(server.app)
        .get("/check-all-by-addresses")
        .query({
          chainIds: CHAIN_ID,
          addresses: defaultContractAddress,
        })
        .end((err, res) =>
          assertLookup(err, res, defaultContractAddress, "false", done)
        );
    });

    it("should fail for invalid address", (done) => {
      chai
        .request(server.app)
        .get("/check-all-by-addresses")
        .query({ chainIds: CHAIN_ID, addresses: invalidAddress })
        .end((err, res) => {
          assertValidationError(err, res, "addresses");
          done();
        });
    });

    it("should return false for unverified contract but then perfect after verification", (done) => {
      chai
        .request(server.app)
        .get("/check-all-by-addresses")
        .query({
          chainIds: CHAIN_ID,
          addresses: defaultContractAddress,
        })
        .end((err, res) => {
          assertLookup(err, res, defaultContractAddress, "false");
          chai
            .request(server.app)
            .post("/")
            .field("address", defaultContractAddress)
            .field("chain", CHAIN_ID)
            .attach("files", metadataBuffer, "metadata.json")
            .attach("files", sourceBuffer)
            .end((err, res) => {
              chai.expect(err).to.be.null;
              chai.expect(res.status).to.equal(StatusCodes.OK);

              chai
                .request(server.app)
                .get("/check-all-by-addresses")
                .query({
                  chainIds: CHAIN_ID,
                  addresses: defaultContractAddress,
                })
                .end((err, res) =>
                  assertLookupAll(
                    err,
                    res,
                    defaultContractAddress,
                    [{ chainId: CHAIN_ID, status: "perfect" }],
                    done
                  )
                );
            });
        });
    });

    it("should convert addresses to checksummed format", (done) => {
      chai
        .request(server.app)
        .get("/check-all-by-addresses")
        .query({
          chainIds: CHAIN_ID,
          addresses: defaultContractAddress.toLowerCase(),
        })
        .end((err, res) => {
          chai.expect(err).to.be.null;
          chai.expect(res.status).to.equal(StatusCodes.OK);
          chai.expect(res.body).to.have.a.lengthOf(1);
          const result = res.body[0];
          chai.expect(result.address).to.equal(defaultContractAddress);
          chai.expect(result.status).to.equal("false");
          done();
        });
    });
  });

  describe("/", function () {

    const checkNonVerified = (path, done) => {
      chai
        .request(server.app)
        .post(path)
        .field("chain", CHAIN_ID)
        .field("address", defaultContractAddress)
        .end((err, res) => {
          chai.expect(err).to.be.null;
          chai.expect(res.body).to.haveOwnProperty("error");
          chai.expect(res.status).to.equal(StatusCodes.NOT_FOUND);
          done();
        });
    };

    it("should correctly inform for an address check of a non verified contract (at /)", (done) => {
      checkNonVerified("/", done);
    });

    it("should correctly inform for an address check of a non verified contract (at /verify)", (done) => {
      checkNonVerified("/verify", done);
    });

    it("should verify multipart upload", (done) => {
      chai
        .request(server.app)
        .post("/")
        .field("address", defaultContractAddress)
        .field("chain", CHAIN_ID)
        .attach("files", metadataBuffer, "metadata.json")
        .attach("files", sourceBuffer, "Storage.sol")
        .end((err, res) =>
          assertVerification(
            err,
            res,
            done,
            defaultContractAddress,
            CHAIN_ID,
            "perfect"
          )
        );
    });

    it("should verify json upload with string properties", (done) => {
      chai
        .request(server.app)
        .post("/")
        .send({
          address: defaultContractAddress,
          chain: CHAIN_ID,
          files: {
            "metadata.json": metadataBuffer.toString(),
            "Storage.sol": sourceBuffer.toString(),
          },
        })
        .end((err, res) =>
          assertVerification(
            err,
            res,
            done,
            defaultContractAddress,
            CHAIN_ID,
            "perfect"
          )
        );
    });

    it("should verify json upload with Buffer properties", (done) => {
      chai
        .request(server.app)
        .post("/")
        .send({
          address: defaultContractAddress,
          chain: CHAIN_ID,
          files: {
            "metadata.json": metadataBuffer,
            "Storage.sol": sourceBuffer,
          },
        })
        .end((err, res) =>
          assertVerification(
            err,
            res,
            done,
            defaultContractAddress,
            CHAIN_ID,
            "perfect"
          )
        );
    });

    const assertMissingFile = (err, res) => {
      chai.expect(err).to.be.null;
      chai.expect(res.body).to.haveOwnProperty("error");
      const errorMessage = res.body.error.toLowerCase();
      chai.expect(res.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
      chai.expect(errorMessage).to.include("missing");
      chai.expect(errorMessage).to.include("Storage".toLowerCase());
    };

    it("should return 'partial', then delete partial when 'full' match", (done) => {
      const partialMetadata = require("./testcontracts/Storage/metadataModified.json");
      const partialMetadataBuffer = Buffer.from(
        JSON.stringify(partialMetadata)
      );

      const partialSourcePath = path.join(
        "test",
        "testcontracts",
        "Storage",
        "StorageModified.sol"
      );
      const partialSourceBuffer = fs.readFileSync(partialSourcePath);

      const partialMetadataURL = `/repository/contracts/partial_match/${CHAIN_ID}/${defaultContractAddress}/metadata.json`;

      chai
        .request(server.app)
        .post("/")
        .field("address", defaultContractAddress)
        .field("chain", CHAIN_ID)
        .attach("files", partialMetadataBuffer, "metadata.json")
        .attach("files", partialSourceBuffer)
        .end((err, res) => {
          assertVerification(
            err,
            res,
            null,
            defaultContractAddress,
            CHAIN_ID,
            "partial"
          );

          chai
            .request(server.app)
            .get(partialMetadataURL)
            .end((err, res) => {
              chai.expect(err).to.be.null;
              chai.expect(res.body).to.deep.equal(partialMetadata);

              chai
                .request(server.app)
                .post("/")
                .field("address", defaultContractAddress)
                .field("chain", CHAIN_ID)
                .attach("files", metadataBuffer, "metadata.json")
                .attach("files", sourceBuffer)
                .end(async (err, res) => {
                  assertVerification(
                    err,
                    res,
                    null,
                    defaultContractAddress,
                    CHAIN_ID
                  );

                  await waitSecs(2); // allow server some time to execute the deletion (it started *after* the last response)
                  chai
                    .request(server.app)
                    .get(partialMetadataURL)
                    .end((err, res) => {
                      chai.expect(err).to.be.null;
                      chai.expect(res.status).to.equal(StatusCodes.NOT_FOUND);
                      done();
                    });
                });
            });
        });
    });

    it("should mark contracts without an embedded metadata hash as a 'partial' match", async () => {
      // Simple contract without bytecode at https://goerli.etherscan.io/address/0x093203902B71Cdb1dAA83153b3Df284CD1a2f88d
      const bytecode =
        "0x6080604052348015600f57600080fd5b50601680601d6000396000f3fe6080604052600080fdfea164736f6c6343000700000a";
      const metadataPath = path.join("test", "sources", "metadata", "withoutMetadataHash.meta.object.json");
      const metadataBuffer = fs.readFileSync(metadataPath);
      const metadata = JSON.parse(metadataBuffer.toString());
      const address = await deployFromAbiAndBytecode(
        localSigner,
        metadata.output.abi,
        bytecode
      );

      const res = await chai
        .request(server.app)
        .post("/")
        .field("address", address)
        .field("chain", CHAIN_ID)
        .attach("files", metadataBuffer, "metadata.json");

      assertVerification(
        null,
        res,
        null,
        address,
        CHAIN_ID,
        "partial"
      );
    });

    it("should verify a contract with immutables and save immutable-references.json", async () => {
      const artifact = require("./testcontracts/WithImmutables/artifact.json");
      const { contractAddress } =
        await deployFromAbiAndBytecodeForCreatorTxHash(
          localSigner,
          artifact.abi,
          artifact.bytecode,
          [999]
        );

      const metadata = require("./testcontracts/WithImmutables/metadata.json");
      const sourcePath = path.join("test", "testcontracts", "WithImmutables", "sources", "WithImmutables.sol");
      const sourceBuffer = fs.readFileSync(sourcePath);

      // Now pass the creatorTxHash
      const res = await chai
        .request(server.app)
        .post("/")
        .send({
          address: contractAddress,
          chain: CHAIN_ID,
          files: {
            "metadata.json": JSON.stringify(metadata),
            "WithImmutables.sol": sourceBuffer.toString(),
          },
        });
      assertVerification(
        null,
        res,
        null,
        contractAddress,
        CHAIN_ID
      );
      const isExist = fs.existsSync(
        path.join(
          server.repository,
          "contracts",
          "full_match",
          CHAIN_ID,
          contractAddress,
          "immutable-references.json"
        )
      );
      chai.expect(isExist, "Immutable references not saved").to.be.true;
    });

    it("should return validation error for adding standard input JSON without a compiler version", async () => {
      const address = await deployFromAbiAndBytecode(
        localSigner,
        artifact.abi, // Storage.sol
        artifact.bytecode
      );
      const solcJsonPath = path.join(
        "test",
        "testcontracts",
        "Storage",
        "StorageJsonInput.json"
      );
      const solcJsonBuffer = fs.readFileSync(solcJsonPath);

      const res = await chai
        .request(server.app)
        .post("/verify/solc-json")
        .attach("files", solcJsonBuffer, "solc.json")
        .field("address", address)
        .field("chain", CHAIN_ID)
        .field("contractName", "Storage");

      assertValidationError(null, res, "compilerVersion");
    });

    it("should return validation error for adding standard input JSON without a contract name", async () => {
      const address = await deployFromAbiAndBytecode(
        localSigner,
        artifact.abi, // Storage.sol
        artifact.bytecode
      );
      const solcJsonPath = path.join(
        "test",
        "testcontracts",
        "Storage",
        "StorageJsonInput.json"
      );
      const solcJsonBuffer = fs.readFileSync(solcJsonPath);

      const res = await chai
        .request(server.app)
        .post("/verify/solc-json")
        .attach("files", solcJsonBuffer)
        .field("address", address)
        .field("chain", CHAIN_ID)
        .field("compilerVersion", "0.8.4+commit.c7e474f2");

      assertValidationError(null, res, "contractName");
    });

    it("should verify a contract with Solidity standard input JSON", async () => {
      const address = await deployFromAbiAndBytecode(
        localSigner,
        artifact.abi, // Storage.sol
        artifact.bytecode
      );
      const solcJsonPath = path.join(
        "test",
        "testcontracts",
        "Storage",
        "StorageJsonInput.json"
      );
      const solcJsonBuffer = fs.readFileSync(solcJsonPath);

      const res = await chai
        .request(server.app)
        .post("/verify/solc-json")
        .attach("files", solcJsonBuffer, "solc.json")
        .field("address", address)
        .field("chain", CHAIN_ID)
        .field("compilerVersion", "0.8.4+commit.c7e474f2")
        .field("contractName", "Storage");

      assertVerification(null, res, null, address, CHAIN_ID);
    });

    describe("hardhat build-info file support", function () {
      let address;
      const mainContractIndex = 5;
      const hardhatOutputJSON = require("./sources/hardhat-output/output.json");
      const MyToken =
        hardhatOutputJSON.output.contracts["contracts/MyToken.sol"].MyToken;
      const hardhatOutputBuffer = Buffer.from(
        JSON.stringify(hardhatOutputJSON)
      );
      before(async function () {
        address = await deployFromAbiAndBytecode(
          localSigner,
          MyToken.abi,
          MyToken.evm.bytecode.object,
          ["Sourcify Hardhat Test", "TEST"]
        );
        console.log(`Contract deployed at ${address}`);
        await waitSecs(3);
      });

      it("should detect multiple contracts in the build-info file", (done) => {
        chai
          .request(server.app)
          .post("/")
          .field("chain", CHAIN_ID)
          .field("address", address)
          .attach("files", hardhatOutputBuffer)
          .then((res) => {
            chai.expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
            chai.expect(res.body.contractsToChoose.length).to.be.equal(6);
            chai
              .expect(res.body.error)
              .to.be.a("string")
              .and.satisfy((msg) => msg.startsWith("Detected "));
            done();
          });
      });

      it("should verify the chosen contract in the build-info file", (done) => {
        chai
          .request(server.app)
          .post("/")
          .field("chain", CHAIN_ID)
          .field("address", address)
          .field("chosenContract", mainContractIndex)
          .attach("files", hardhatOutputBuffer)
          .end((err, res) => {
            assertVerification(
              err,
              res,
              done,
              address,
              CHAIN_ID,
              "perfect"
            );
          });
      });

      it("should store a contract in /contracts/full_match|partial_match/0xADDRESS despite the files paths in the metadata", async () => {
        const artifact = require("./testcontracts/Storage/Storage.json");
        const { contractAddress } =
          await deployFromAbiAndBytecodeForCreatorTxHash(
            localSigner,
            artifact.abi,
            artifact.bytecode,
            []
          );

        const metadata = require("./testcontracts/Storage/metadata.upMultipleDirs.json");
        const sourcePath = path.join(
          "test",
          "testcontracts",
          "Storage",
          "Storage.sol"
        );
        const sourceBuffer = fs.readFileSync(sourcePath);

        // Now pass the creatorTxHash
        const res = await chai
          .request(server.app)
          .post("/")
          .send({
            address: contractAddress,
            chain: CHAIN_ID,
            files: {
              "metadata.json": JSON.stringify(metadata),
              "Storage.sol": sourceBuffer.toString(),
            },
          });
        assertVerification(
          null,
          res,
          null,
          contractAddress,
          CHAIN_ID,
          "partial"
        );
        const savedPath = path.join(
            server.repository,
            "contracts",
            "partial_match",
            CHAIN_ID,
            contractAddress,
            "sources",
            "Storage.sol"
          );
        const isExist = fs.existsSync(savedPath);
        chai.expect(isExist, "Files saved in the wrong directory: " + savedPath).to.be.true;
      });
    });

    describe("solc v0.6.12 and v0.7.0 extra files in compilation causing metadata match but bytecode mismatch", function () {
      // Deploy the test contract locally
      // Contract from https://explorer.celo.org/address/0x923182024d0Fa5dEe59E3c3db5e2eeD23728D3C3/contracts
      let contractAddress;
      const bytecodeMismatchArtifact = require("./sources/artifacts/extraFilesBytecodeMismatch.json");

      before(async () => {
        contractAddress = await deployFromAbiAndBytecode(
          localSigner,
          bytecodeMismatchArtifact.abi,
          bytecodeMismatchArtifact.bytecode
        );
      });

      it("should verify with all input files and not only those in metadata", (done) => {
        const hardhatOutput = require("./sources/hardhat-output/extraFilesBytecodeMismatch.json");
        const hardhatOutputBuffer = Buffer.from(JSON.stringify(hardhatOutput));
        chai
          .request(server.app)
          .post("/")
          .field("chain", CHAIN_ID)
          .field("address", contractAddress)
          .attach("files", hardhatOutputBuffer)
          .end((err, res) => {
            assertVerification(
              err,
              res,
              done,
              contractAddress,
              CHAIN_ID,
              "perfect"
            );
          });
      });
    });
  });

  describe("session api verification", function () {

    it("should inform when no pending contracts", (done) => {
      chai
        .request(server.app)
        .post("/session/verify-validated")
        .send({})
        .end((err, res) => {
          chai.expect(err).to.be.null;
          chai.expect(res.body).to.haveOwnProperty("error");
          chai.expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
          chai
            .expect(res.body.error)
            .to.equal("There are currently no pending contracts.");
          done();
        });
    });

    const assertAddressAndChainMissing = (
      res,
      expectedFound,
      expectedMissing
    ) => {
      chai.expect(res.status).to.equal(StatusCodes.OK);
      const contracts = res.body.contracts;
      chai.expect(contracts).to.have.a.lengthOf(1);

      const contract = contracts[0];
      chai.expect(contract.status).to.equal("error");
      chai.expect(contract.files.missing).to.deep.equal(expectedMissing);
      chai.expect(contract.files.found).to.deep.equal(expectedFound);
      chai.expect(res.body.unused).to.be.empty;
      chai.expect(contract.storageTimestamp).to.equal(undefined);
      return contracts;
    };

    it("should accept file upload in JSON format", (done) => {
      chai
        .request(server.app)
        .post("/session/input-files")
        .send({
          files: {
            "metadata.json": metadataBuffer.toString(),
            "Storage.sol": sourceBuffer.toString(),
          },
        })
        .then((res) => {
          assertAddressAndChainMissing(
            res,
            ["project:/contracts/Storage.sol"],
            {}
          );
          done();
        });
    });

    it("should not verify after addition of metadata+source, but should after providing address+chainId", (done) => {
      const agent = chai.request.agent(server.app);
      agent
        .post("/session/input-files")
        .attach("files", sourceBuffer, "Storage.sol")
        .attach("files", metadataBuffer, "metadata.json")
        .then((res) => {
          const contracts = assertAddressAndChainMissing(
            res,
            ["project:/contracts/Storage.sol"],
            {}
          );
          contracts[0].address = defaultContractAddress;
          contracts[0].chainId = CHAIN_ID;

          agent
            .post("/session/verify-validated")
            .send({ contracts })
            .end((err, res) => {
              assertVerificationSession(
                err,
                res,
                done,
                defaultContractAddress,
                CHAIN_ID,
                "perfect"
              );
            });
        });
    });

    const assertAfterMetadataUpload = (err, res) => {
      chai.expect(err).to.be.null;
      chai.expect(res.status).to.equal(StatusCodes.OK);
      chai.expect(res.body.unused).to.be.empty;

      const contracts = res.body.contracts;
      chai.expect(contracts).to.have.a.lengthOf(1);
      const contract = contracts[0];

      chai.expect(contract.name).to.equal("Storage");
      chai.expect(contract.status).to.equal("error");
    };

    it("should not verify when session cookie not stored clientside", (done) => {
      chai
        .request(server.app)
        .post("/session/input-files")
        .attach("files", metadataBuffer, "metadata.json")
        .end((err, res) => {
          assertAfterMetadataUpload(err, res);

          chai
            .request(server.app)
            .post("/session/input-files")
            .attach("files", sourceBuffer, "Storage.sol")
            .end((err, res) => {
              chai.expect(err).to.be.null;
              chai.expect(res.status).to.equal(StatusCodes.OK);

              chai.expect(res.body.unused).to.deep.equal(["Storage.sol"]);
              chai.expect(res.body.contracts).to.be.empty;
              done();
            });
        });
    });

    it("should verify when session cookie stored clientside", (done) => {
      const agent = chai.request.agent(server.app);
      agent
        .post("/session/input-files")
        .attach("files", metadataBuffer, "metadata.json")
        .end((err, res) => {
          assertAfterMetadataUpload(err, res);
          const contracts = res.body.contracts;

          agent
            .post("/session/input-files")
            .attach("files", sourceBuffer, "Storage.sol")
            .end((err, res) => {
              contracts[0].chainId = CHAIN_ID;
              contracts[0].address = defaultContractAddress;
              assertVerificationSession(
                err,
                res,
                null,
                undefined,
                undefined,
                "error"
              );

              agent
                .post("/session/verify-validated")
                .send({ contracts })
                .end((err, res) => {
                  assertVerificationSession(
                    err,
                    res,
                    done,
                    defaultContractAddress,
                    CHAIN_ID,
                    "perfect"
                  );
                });
            });
        });
    });

    it("should fail with HTTP 413 if a file above max server file size is uploaded", (done) => {
      const MAX_FILE_SIZE = config.get("server.maxFileSize");

      const agent = chai.request.agent(server.app);
      const file = "a".repeat(MAX_FILE_SIZE + 1);
      agent
        .post("/session/input-files")
        .attach("files", Buffer.from(file))
        .then((res) => {
          chai.expect(res.status).to.equal(StatusCodes.REQUEST_TOO_LONG);
          done();
        });
    });

    it("should fail if too many files uploaded, but should succeed after deletion", async () => {
      const MAX_FILE_SIZE = config.get("server.maxFileSize");

const MAX_SESSION_SIZE =
  // require("../dist/server/controllers/verification/verification.common").MAX_SESSION_SIZE;
  require("../sourcify/services/server/dist/server/controllers/verification/verification.common").MAX_SESSION_SIZE;

      const agent = chai.request.agent(server.app);
      let res;
      const maxNumMaxFiles = Math.floor(MAX_SESSION_SIZE / MAX_FILE_SIZE); // Max number of max size files allowed in a session
      const file = "a".repeat((MAX_FILE_SIZE * 3) / 4); // because of base64 encoding which increases size by 1/3, making it 4/3 of the original
      for (let i = 0; i < maxNumMaxFiles; i++) {
        // Should be allowed each time
        res = await agent
          .post("/session/input-files")
          .attach("files", Buffer.from(file));
        chai.expect(res.status).to.equal(StatusCodes.OK);
      }
      // Should exceed size this time
      res = await agent
        .post("/session/input-files")
        .attach("files", Buffer.from(file));
      chai.expect(res.status).to.equal(StatusCodes.REQUEST_TOO_LONG);
      chai.expect(res.body.error).to.exist;
      // Should be back to normal
      res = await agent.post("/session/clear");
      chai.expect(res.status).to.equal(StatusCodes.OK);
      res = await agent
        .post("/session/input-files")
        .attach("files", Buffer.from("a"));
      chai.expect(res.status).to.equal(StatusCodes.OK);
      console.log("done");
    });

    const assertSingleContractStatus = (
      res,
      expectedStatus,
      shouldHaveTimestamp
    ) => {
      chai.expect(res.status).to.equal(StatusCodes.OK);
      chai.expect(res.body).to.haveOwnProperty("contracts");
      const contracts = res.body.contracts;
      chai.expect(contracts).to.have.a.lengthOf(1);
      const contract = contracts[0];
      chai.expect(contract.status).to.equal(expectedStatus);
      chai.expect(!!contract.storageTimestamp).to.equal(!!shouldHaveTimestamp);
      return contracts;
    };

    it("should verify after providing address and then network; should provide timestamp when verifying again", (done) => {
      const agent = chai.request.agent(server.app);
      agent
        .post("/session/input-files")
        .attach("files", sourceBuffer)
        .attach("files", metadataBuffer)
        .then((res) => {
          const contracts = assertSingleContractStatus(res, "error");
          contracts[0].address = defaultContractAddress;

          agent
            .post("/session/verify-validated")
            .send({ contracts })
            .then((res) => {
              assertSingleContractStatus(res, "error");
              contracts[0].chainId = CHAIN_ID;

              agent
                .post("/session/verify-validated")
                .send({ contracts })
                .then((res) => {
                  assertSingleContractStatus(res, "perfect");

                  agent
                    .post("/session/verify-validated")
                    .send({ contracts })
                    .then((res) => {
                      assertSingleContractStatus(res, "perfect", true);
                      done();
                    });
                });
            });
        });
    });

    describe("dryrun query parameter", function () {
      it("should not store the successful verification result when the query parameter dryrun=true is provided", (done) => {
        const agent = chai.request.agent(server.app);
        agent
          .post("/session/input-files?dryrun=true")
          .attach("files", sourceBuffer)
          .attach("files", metadataBuffer)
          .then((res) => {
            const contracts = assertSingleContractStatus(res, "error");
            contracts[0].address = defaultContractAddress;

            agent
              .post("/session/verify-checked?dryrun=true")
              .send({contracts})
              .then((res) => {
                assertSingleContractStatus(res, "error");
                contracts[0].chainId = CHAIN_ID;

                agent
                  .post("/session/verify-checked?dryrun=true")
                  .send({contracts})
                  .then((res) => {
                    assertSingleContractStatus(res, "perfect");
                    assertContractNotSaved(defaultContractAddress, CHAIN_ID);
                    done();
                  });
              });
          });
      });

      it("should store the successful verification result when the query parameter dryrun=false is provided", (done) => {
        const agent = chai.request.agent(server.app);
        agent
          .post("/session/input-files?dryrun=false")
          .attach("files", sourceBuffer)
          .attach("files", metadataBuffer)
          .then((res) => {
            const contracts = assertSingleContractStatus(res, "error");
            contracts[0].address = defaultContractAddress;

            agent
              .post("/session/verify-checked?dryrun=false")
              .send({contracts})
              .then((res) => {
                assertSingleContractStatus(res, "error");
                contracts[0].chainId = CHAIN_ID;

                agent
                  .post("/session/verify-checked?dryrun=false")
                  .send({contracts})
                  .then((res) => {
                    assertSingleContractStatus(res, "perfect");
                    assertContractSaved(defaultContractAddress, CHAIN_ID, "perfect");
                    done();
                  });
              });
          });
      });

      it("should store the successful verification result when the query parameter dryrun is not provided", (done) => {
        const agent = chai.request.agent(server.app);
        agent
          .post("/session/input-files")
          .attach("files", sourceBuffer)
          .attach("files", metadataBuffer)
          .then((res) => {
            const contracts = assertSingleContractStatus(res, "error");
            contracts[0].address = defaultContractAddress;

            agent
              .post("/session/verify-checked")
              .send({contracts})
              .then((res) => {
                assertSingleContractStatus(res, "error");
                contracts[0].chainId = CHAIN_ID;

                agent
                  .post("/session/verify-checked")
                  .send({contracts})
                  .then((res) => {
                    assertSingleContractStatus(res, "perfect");
                    assertContractSaved(defaultContractAddress, CHAIN_ID, "perfect");
                    done();
                  });
              });
          });
      });
    });

    it("should fetch missing sources", (done) => {
      const agent = chai.request.agent(server.app);
      agent
        .post("/session/input-files")
        .attach("files", metadataBuffer)
        .then((res) => {
          assertAddressAndChainMissing(
            res,
            ["project:/contracts/Storage.sol"],
            {}
          );
          done();
        });
    });

    it("should verify after fetching and then providing address+chainId", (done) => {
      const agent = chai.request.agent(server.app);
      agent
        .post("/session/input-files")
        .attach("files", metadataBuffer)
        .then((res) => {
          const contracts = assertAddressAndChainMissing(
            res,
            ["project:/contracts/Storage.sol"],
            {}
          );
          contracts[0].address = defaultContractAddress;
          contracts[0].chainId = CHAIN_ID;

          agent
            .post("/session/verify-validated")
            .send({ contracts })
            .then((res) => {
              assertSingleContractStatus(res, "perfect");
              done();
            });
        });
    });

    it("should find contracts in a zipped Truffle project", (done) => {
      const zippedTrufflePath = path.join("test", "sources", "truffle", "truffle-example.zip");
      const zippedTruffleBuffer = fs.readFileSync(zippedTrufflePath);
      chai
        .request(server.app)
        .post("/session/input-files")
        .attach("files", zippedTruffleBuffer)
        .then((res) => {
          chai.expect(res.status).to.equal(StatusCodes.OK);
          chai.expect(res.body.contracts).to.have.lengthOf(3);
          done();
        });
      it("should correctly handle when uploaded 0/2 and then 1/2 sources", (done) => {
        const metadataPath = path.join("test", "sources", "metadata", "child-contract.meta.object.json");
        const metadataBuffer = fs.readFileSync(metadataPath);

        const parentPath = path.join("test", "sources", "contracts", "ParentContract.sol");
        const parentBuffer = fs.readFileSync(parentPath);

        const agent = chai.request.agent(server.app);
        agent
          .post("/session/input-files")
          .attach("files", metadataBuffer)
          .then((res) => {
            chai.expect(res.status).to.equal(StatusCodes.OK);
            chai.expect(res.body.contracts).to.have.lengthOf(1);
            chai.expect(res.body.unused).to.be.empty;

            const contract = res.body.contracts[0];
            chai.expect(contract.files.found).to.have.lengthOf(0);
            chai.expect(contract.files.missing).to.have.lengthOf(2);

            agent
              .post("/session/input-files")
              .attach("files", parentBuffer)
              .then((res) => {
                chai.expect(res.status).to.equal(StatusCodes.OK);
                chai.expect(res.body.contracts).to.have.lengthOf(1);
                chai.expect(res.body.unused).to.be.empty;

                const contract = res.body.contracts[0];
                chai.expect(contract.files.found).to.have.lengthOf(1);
                chai.expect(contract.files.missing).to.have.lengthOf(1);

                done();
              });
          });
      });

      it("should find contracts in a zipped Truffle project", (done) => {
        const zippedTrufflePath = path.join("test", "sources", "truffle", "truffle-example.zip");
        const zippedTruffleBuffer = fs.readFileSync(zippedTrufflePath);
        chai
          .request(server.app)
          .post("/session/input-files")
          .attach("files", zippedTruffleBuffer)
          .then((res) => {
            chai.expect(res.status).to.equal(StatusCodes.OK);
            chai.expect(res.body.contracts).to.have.lengthOf(3);
            chai.expect(res.body.unused).to.be.empty;
            done();
          });
      });
    });

    it("should verify a contract with immutables and save immutable-references.json", async () => {
      const artifact = require("./testcontracts/WithImmutables/artifact.json");
      const { contractAddress } =
        await deployFromAbiAndBytecodeForCreatorTxHash(
          localSigner,
          artifact.abi,
          artifact.bytecode,
          [999]
        );

      const metadata = require("./testcontracts/WithImmutables/metadata.json");
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const sourcePath = path.join("test", "testcontracts", "WithImmutables", "sources", "WithImmutables.sol");
      const sourceBuffer = fs.readFileSync(sourcePath);

      const agent = chai.request.agent(server.app);

      const res1 = await agent
        .post("/session/input-files")
        .attach("files", sourceBuffer)
        .attach("files", metadataBuffer);

      let contracts = assertSingleContractStatus(res1, "error");

      contracts[0].address = contractAddress;
      contracts[0].chainId = CHAIN_ID;
      const res2 = await agent
        .post("/session/verify-validated")
        .send({ contracts });

      assertSingleContractStatus(res2, "perfect");
      const isExist = fs.existsSync(
        path.join(
          server.repository,
          "contracts",
          "full_match",
          CHAIN_ID,
          contractAddress,
          "immutable-references.json"
        )
      );
      chai.expect(isExist, "Immutable references not saved").to.be.true;
    });

    it("should verify a contract created by a factory contract and has immutables", async () => {
      const deployValue = 12345;

      const artifact = require("./testcontracts/FactoryImmutable/Factory.json");
      const factoryAddress = await deployFromAbiAndBytecode(
        localSigner,
        artifact.abi,
        artifact.bytecode
      );

      // Deploy child by calling deploy(uint)
      const childMetadata = require("./testcontracts/FactoryImmutable/Child_metadata.json");
      const childMetadataBuffer = Buffer.from(JSON.stringify(childMetadata));
      const txReceipt = await callContractMethodWithTx(
        localSigner,
        artifact.abi,
        factoryAddress,
        "deploy",
        [deployValue]
      );

      const childAddress = txReceipt.logs[0].args[0];
      const sourcePath = path.join(
        "test",
        "testcontracts",
        "FactoryImmutable",
        "FactoryTest.sol"
      );
      const sourceBuffer = fs.readFileSync(sourcePath);

      const agent = chai.request.agent(server.app);

      const res1 = await agent
        .post("/session/input-files")
        .attach("files", sourceBuffer)
        .attach("files", childMetadataBuffer);

      const contracts = assertSingleContractStatus(res1, "error");

      contracts[0].address = childAddress;
      contracts[0].chainId = CHAIN_ID;

      const res = await agent
        .post("/session/verify-validated")
        .send({ contracts });
      assertSingleContractStatus(res, "perfect");
    });

    it("should verify a contract created by a factory contract and has immutables without constructor arguments but with msg.sender assigned immutable", async () => {
      const artifact = require("./testcontracts/FactoryImmutableWithoutConstrArg/Factory3.json");
      const factoryAddress = await deployFromAbiAndBytecode(
        localSigner,
        artifact.abi,
        artifact.bytecode
      );

      // Deploy child by calling deploy(uint)
      const childMetadata = require("./testcontracts/FactoryImmutableWithoutConstrArg/Child3_metadata.json");
      const childMetadataBuffer = Buffer.from(JSON.stringify(childMetadata));
      const txReceipt = await callContractMethodWithTx(
        localSigner,
        artifact.abi,
        factoryAddress,
        "createChild",
        []
      );

      const childAddress = txReceipt.logs[0].args[0];
      const sourcePath = path.join(
        "test",
        "testcontracts",
        "FactoryImmutableWithoutConstrArg",
        "FactoryTest3.sol"
      );
      const sourceBuffer = fs.readFileSync(sourcePath);

      const agent = chai.request.agent(server.app);

      const res1 = await agent
        .post("/session/input-files")
        .attach("files", sourceBuffer)
        .attach("files", childMetadataBuffer);

      const contracts = assertSingleContractStatus(res1, "error");

      contracts[0].address = childAddress;
      contracts[0].chainId = CHAIN_ID;
      const res = await agent
        .post("/session/verify-validated")
        .send({ contracts });
      assertSingleContractStatus(res, "perfect");
    });

    it("should return validation error for adding standard input JSON without a compiler version", async () => {
      const agent = chai.request.agent(server.app);

      const solcJsonPath = path.join(
        "test",
        "testcontracts",
        "Storage",
        "StorageJsonInput.json"
      );
      const solcJsonBuffer = fs.readFileSync(solcJsonPath);

      const res = await agent
        .post("/session/input-solc-json")
        .attach("files", solcJsonBuffer);

      assertValidationError(null, res, "compilerVersion");
    });

    it("should verify a contract with Solidity standard input JSON", async () => {
      const agent = chai.request.agent(server.app);
      const address = await deployFromAbiAndBytecode(
        localSigner,
        artifact.abi, // Storage.sol
        artifact.bytecode
      );
      const solcJsonPath = path.join(
        "test",
        "testcontracts",
        "Storage",
        "StorageJsonInput.json"
      );
      const solcJsonBuffer = fs.readFileSync(solcJsonPath);

      const res = await agent
        .post("/session/input-solc-json")
        .field("compilerVersion", "0.8.4+commit.c7e474f2")
        .attach("files", solcJsonBuffer, "solc.json");

      const contracts = assertSingleContractStatus(res, "error");

      contracts[0].address = address;
      contracts[0].chainId = CHAIN_ID;

      const res2 = await agent
        .post("/session/verify-validated")
        .send({ contracts });
      assertSingleContractStatus(res2, "perfect");
    });

    // Test also extra-file-bytecode-mismatch via v2 API as well since the workaround is at the API level i.e. VerificationController
    describe("solc v0.6.12 and v0.7.0 extra files in compilation causing metadata match but bytecode mismatch", function () {
      // Deploy the test contract locally
      // Contract from https://explorer.celo.org/address/0x923182024d0Fa5dEe59E3c3db5e2eeD23728D3C3/contracts
      let contractAddress;
      const bytecodeMismatchArtifact = require("./sources/artifacts/extraFilesBytecodeMismatch.json");

      before(async () => {
        contractAddress = await deployFromAbiAndBytecode(
          localSigner,
          bytecodeMismatchArtifact.abi,
          bytecodeMismatchArtifact.bytecode
        );
      });

      it("should verify with all input files and not only those in metadata", (done) => {
        const hardhatOutput = require("./sources/hardhat-output/extraFilesBytecodeMismatch.json");
        const hardhatOutputBuffer = Buffer.from(JSON.stringify(hardhatOutput));

        const agent = chai.request.agent(server.app);
        agent
          .post("/session/input-files")
          .attach("files", hardhatOutputBuffer)
          .then((res) => {
            const contracts = res.body.contracts;
            contracts[0].address = contractAddress;
            contracts[0].chainId = CHAIN_ID;
            agent
              .post("/session/verify-validated")
              .send({ contracts })
              .then((res) => {
                assertSingleContractStatus(res, "perfect");
                done();
              });
          });
      });
    });
  });

  describe("Verify repository endpoints", function () {
    const agent = chai.request.agent(server.app);
    it("should fetch files of specific address", async function () {
      await agent
        .post("/")
        .field("address", defaultContractAddress)
        .field("chain", CHAIN_ID)
        .attach("files", metadataBuffer, "metadata.json")
        .attach("files", sourceBuffer, "Storage.sol");
      const res0 = await agent.get(
        `/files/${CHAIN_ID}/${defaultContractAddress}`
      );
      chai.expect(res0.body).has.a.lengthOf(2);
      const res1 = await agent.get(
        `/files/tree/any/${CHAIN_ID}/${defaultContractAddress}`
      );
      chai.expect(res1.body?.status).equals("full");
      const res2 = await agent.get(
        `/files/any/${CHAIN_ID}/${defaultContractAddress}`
      );
      chai.expect(res2.body?.status).equals("full");
      const res3 = await agent.get(
        `/files/tree/${CHAIN_ID}/${defaultContractAddress}`
      );
      chai.expect(res3.body).has.a.lengthOf(2);
      const res4 = await agent.get(`/files/contracts/${CHAIN_ID}`);
      chai.expect(res4.body.full).has.a.lengthOf(1);
    });
  });

  describe("Verify server status endpoint", function () {
    it("should check server's health", async function () {
      const res = await chai.request(server.app).get("/health");
      chai.expect(res.text).equals("Alive and kicking!");
    });

    it("should check server's chains", async function () {
      const res = await chai.request(server.app).get("/chains");
      chai.expect(res.body.length).greaterThan(0);
    });
  });

});
