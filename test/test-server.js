const {ContractFunctionParameters} = require("@hashgraph/sdk");
const axios = require("axios");
const {describe, it} = require("mocha");
const {expect} = require("chai");
const SdkClient = require("./helpers/sdkClient");
const fs = require("fs");
require('dotenv').config({path: './environments/.env'});

describe('Basic non-regression of hedera-sourcify server', function () {

  const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:5002"
  this.timeout(20000) // Overwrite Mocha timeout of 2sec -> 20sec

  it('Should return correct verification status for newly created contract', async function () {

    console.log(`Contacting server at URL: ${SERVER_URL}`)
    let health = await axios.get(`${SERVER_URL}/health`)
    console.log(`Server health: ${JSON.stringify(health.data)}`)

    // Grab Hedera network, account ID and private key from .env file
    const network = process.env.HEDERA_NETWORK ?? 'local'
    const accountId = process.env.OPERATOR_ACCOUNT_ID
    const privateKey = process.env.OPERATOR_KEY
    if (!accountId || !privateKey) {
      throw new Error("Environment variables OPERATOR_ACCOUNT_ID and OPERATOR_KEY must be defined")
    }

    const client = new SdkClient(network, accountId,privateKey )
    const chainId = client.getChainId()

    // Import the compiled contract from the HelloHedera.json file
    const solcJsonOutput = JSON.parse(fs.readFileSync("./test/hello-hedera/HelloHedera.json").toString())
    const byteCode = solcJsonOutput.data.bytecode.object

    // Instantiate and deploy the contract
    const contractId = await client.contractDeploy(
      byteCode,
      new ContractFunctionParameters().addString("Hello from Hedera!"),
      100000,
      "HelloHedera.sol"
    );
    const contractAddress = contractId.toSolidityAddress()
    console.log("Deployed contract Address is " + contractAddress);

    // Make call to Sourcify to check that contract is not verified
    const checkUrl = `${SERVER_URL}/check-by-addresses?addresses=${contractAddress}&chainIds=${chainId}`

    let response = await axios.get(checkUrl)
    // console.log(`Verification status for contract ${response.data[0].address} is: ${response.data[0].status}`);
    expect(response.data[0].status).to.equal('false');


    // Make call to Sourcify to submit contract verification
    const solidityFileContent = fs.readFileSync("./test/hello-hedera/HelloHedera.sol");
    const metadataFileContent = fs.readFileSync("./test/hello-hedera/HelloHedera_metadata.json");

    const verificationData = {
      address: contractAddress,
      chain: chainId.toString(),
      files: {
        'HelloHedera_metadata.json': metadataFileContent,
        'HelloHedera.sol': solidityFileContent
      }
    }

    response = await axios.post(`${SERVER_URL}/verify`, verificationData)
    // console.log(`Verification response: ${JSON.stringify(response.data)}`);
    expect(response.data.result[0].status).to.equal('perfect');

    // Make call to Sourcify to check that contract is now verified
    response = await axios.get(checkUrl)
    // console.log(`Verification status for contract ${response.data[0].address} is: ${response.data[0].status}`);
    expect(response.data[0].status).to.equal('perfect');

    return Promise.resolve();
  });

});
