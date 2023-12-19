const { StatusCodes } = require("http-status-codes");
const chai = require("chai");
const config = require("../../dist/config").default;
const path = require("path");
const fs = require("fs");
const { getAddress } = require("ethers");

const assertValidationError = (err, res, field, message) => {
  try {
    chai.expect(err).to.be.null;
    chai.expect(res.body.message.toLowerCase()).to.include(field.toLowerCase());
    if (message) chai.expect(res.body.message).to.equal(message);
    chai.expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
  } catch (err) {
    console.log("Not validating as expected:");
    console.log(JSON.stringify(res.body, null, 2));
    throw err;
  }
};

const assertVerification = (
  err,
  res,
  done,
  expectedAddress,
  expectedChain,
  expectedStatus = "perfect"
) => {
  try {
    // currentResponse = res;
    chai.expect(err).to.be.null;
    chai.expect(res.status).to.equal(StatusCodes.OK);
    chai.expect(res.body).to.haveOwnProperty("result");
    const resultArr = res.body.result;
    chai.expect(resultArr).to.have.a.lengthOf(1);
    const result = resultArr[0];
    chai.expect(result.address).to.equal(expectedAddress);
    chai.expect(result.chainId).to.equal(expectedChain);
    chai.expect(result.status).to.equal(expectedStatus);

    assertContractSaved(expectedAddress, expectedChain, expectedStatus);
    if (done) done();
  } catch (e) {
    console.log(
      `Failing verification for ${expectedAddress} on chain #${expectedChain}.`
    );
    console.log("Response body:");
    console.log(JSON.stringify(res.body, null, 2));
    console.log("Chai Error:");
    console.log(e);
    throw e;
  }
};

const assertVerificationSession = (
  err,
  res,
  done,
  expectedAddress,
  expectedChain,
  expectedStatus
) => {
  try {
    chai.expect(err).to.be.null;
    chai.expect(res.status).to.equal(StatusCodes.OK);

    const contracts = res.body.contracts;
    chai.expect(contracts).to.have.a.lengthOf(1);
    const contract = contracts[0];

    chai.expect(contract.status).to.equal(expectedStatus);
    chai.expect(contract.address).to.equal(expectedAddress);
    chai.expect(contract.chainId).to.equal(expectedChain);

    chai.expect(contract.storageTimestamp).to.not.exist;
    chai.expect(contract.files.missing).to.be.empty;
    chai.expect(contract.files.invalid).to.be.empty;
    assertContractSaved(expectedAddress, expectedChain, expectedStatus);
    if (done) done();
  } catch (e) {
    console.log(
      `Failing verification for ${expectedAddress} on chain #${expectedChain}.`
    );
    console.log("Response body:");
    console.log(JSON.stringify(res.body, null, 2));
    console.log("Chai Error:");
    console.log(e);
    throw e;
  }
};

/**
 * Lookup (check-by-address etc.) doesn't return chainId, otherwise same as assertVerification
 */
const assertLookup = (err, res, expectedAddress, expectedStatus, done) => {
  chai.expect(err).to.be.null;
  chai.expect(res.status).to.equal(StatusCodes.OK);
  const resultArray = res.body;
  chai.expect(resultArray).to.have.a.lengthOf(1);
  const result = resultArray[0];
  chai.expect(result.status).to.equal(expectedStatus);
  chai.expect(result.address).to.equal(expectedAddress);
  if (done) done();
};

/**
 * check-all-by-address returns chain and status objects in an array.
 */
const assertLookupAll = (
  err,
  res,
  expectedAddress,
  expectedChainIds, // Array of { chainId, status }
  done
) => {
  chai.expect(err).to.be.null;
  chai.expect(res.status).to.equal(StatusCodes.OK);
  const resultArray = res.body;
  chai.expect(resultArray).to.have.a.lengthOf(1);
  const result = resultArray[0];
  chai.expect(result.address).to.equal(expectedAddress);
  chai.expect(result.chainIds).to.deep.equal(expectedChainIds);
  if (done) done();
};

/**
 * assertContractSaved checks that the verification result was adequately stored on the file system.
 */
const assertContractSaved = (expectedAddress, expectedChain, expectedStatus) => {
  // Check if saved to the disk
  if (expectedStatus === "perfect" || expectedStatus === "partial") {
    const match = expectedStatus === "perfect" ? "full_match" : "partial_match";
    const isExist = fs.existsSync(
      path.join(
        config.repository.path,
        "contracts",
        match,
        expectedChain,
        getAddress(expectedAddress),
        "metadata.json"
      )
    );
    chai.expect(isExist, "Contract is not saved").to.be.true;
  }
}

/**
 * assertContractNotSaved checks that the verification result was not stored on the file system.
 */
const assertContractNotSaved = (expectedAddress, expectedChain) => {
  // Check contract verification result was NOT saved to the disk
  const fullMatchPath = path.join(
    config.repository.path,
    "contracts",
    "full_match",
    expectedChain,
    getAddress(expectedAddress),
    "metadata.json"
  )
  const partialMatchPath = path.join(
    config.repository.path,
    "contracts",
    "partial_match",
    expectedChain,
    getAddress(expectedAddress),
    "metadata.json"
  )
  const isExist = fs.existsSync(fullMatchPath) || fs.existsSync(partialMatchPath);
  chai.expect(isExist, "Contract should not have been saved").to.be.false;
}

module.exports = {
  assertValidationError,
  assertVerification,
  assertVerificationSession,
  assertLookup,
  assertLookupAll,
  assertContractSaved,
  assertContractNotSaved
}
