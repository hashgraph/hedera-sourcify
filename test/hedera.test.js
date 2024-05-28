const {ContractFunctionParameters} = require("@hashgraph/sdk");
const {expect} = require("chai");
const SdkClient = require("./helpers/sdkClient");
const fs = require("fs");
require('dotenv').config({path: './test/.env.test'});

describe('Basic non-regression of hedera-sourcify server', function () {

  const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:5555"
  this.timeout(20000) // Overwrite Mocha timeout of 2sec -> 20sec

  it('Should return correct verification status for newly created contract', async function () {

    console.log(`Contacting server at URL: ${SERVER_URL}`)
    const health = await fetch(`${SERVER_URL}/health`)
    console.log(`Server health: ${await health.text()}`)

    // Grab Hedera network, account ID and private key from .env file
    const network = process.env.HEDERA_NETWORK ?? 'local'
    const accountId = process.env.OPERATOR_ACCOUNT_ID
    const privateKey = process.env.OPERATOR_KEY
    if (!accountId || !privateKey) {
      throw new Error("Environment variables OPERATOR_ACCOUNT_ID and OPERATOR_KEY must be defined")
    }

    const client = new SdkClient(network, accountId,privateKey )
    const chainId = client.getChainId()
    console.log('Chain ID', chainId);

    // Import the compiled contract from the HelloHedera.json file
    const solcJsonOutput = JSON.parse(fs.readFileSync("./test/hello-hedera/HelloHedera.json").toString())
    const byteCode = solcJsonOutput.data.bytecode.object

    // Instantiate and deploy the contract
    const contractId = await client.contractDeploy(
      byteCode,
      new ContractFunctionParameters().addString("Hello from Hedera!"),
      140000,
      "HelloHedera.sol"
    );
    const contractAddress = contractId.toSolidityAddress()
    console.log("Deployed contract Address is " + contractAddress);

    // Make call to Sourcify to check that contract is not verified
    const checkUrl = `${SERVER_URL}/check-by-addresses?addresses=${contractAddress}&chainIds=${chainId}`

    {
      const data = await (await fetch(checkUrl)).json()
      console.log(`Verification status for contract ${data[0].address} is: ${data[0].status}`);
      expect(data[0].status).to.equal('false');
    }

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

    {
      const data = await (await fetch(`${SERVER_URL}/verify`, {
        method: "POST", 
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verificationData)
      })).json()
      console.log(`Verification response: ${JSON.stringify(data)}`);
      expect(data.result[0].status).to.equal('perfect');
    }

    {
      // Make call to Sourcify to check that contract is now verified
      const data = await (await fetch(checkUrl)).json()
      console.log(`Verification status for contract ${data[0].address} is: ${data[0].status}`);
      expect(data[0].status).to.equal('perfect');
    }

    return Promise.resolve();
  });

});
