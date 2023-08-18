const {Client, Hbar, ContractFunctionParameters, ContractCreateFlow} = require("@hashgraph/sdk");
const axios = require("axios");
const fs = require("fs");
const {describe, it} = require("mocha");
const {expect} = require("chai");
require('dotenv').config({path: './test/hedera/.env'});

describe('Basic non-regression of hedera-sourcify server', function () {

  const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:5555"
  this.timeout(20000); // Overwrite Mocha timeout of 2sec -> 20sec

  it('Should return correct verification status for newly created contract', async function () {

    // Grab Hedera account ID and private key from .env file
    const myAccountId = process.env.OPERATOR_ACCOUNT_ID;
    const myPrivateKey = process.env.OPERATOR_KEY;
    if (!myAccountId || !myPrivateKey) {
      throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }

    // Grab Hedera network to use and Set up Hedera Testnet client
    const network = process.env.HEDERA_NETWORK;
    const chainId = process.env.CHAIN_ID ?? 297

    const client = network === 'mainnet' ? Client.forMainnet() : network === 'testnet' ? Client.forTestnet() : Client.forPreviewnet();
    client.setOperator(myAccountId, myPrivateKey);
    client.setDefaultMaxTransactionFee(new Hbar(100));
    client.setMaxQueryPayment(new Hbar(50));

    // Import the compiled contract from the HelloHedera.json file
    const solcJsonOutput = JSON.parse(fs.readFileSync("./test/hedera/HelloHedera.json"));
    const byteCode = solcJsonOutput.data.bytecode.object;

    // Instantiate the contract
    const contractResponse = await new ContractCreateFlow()
      .setBytecode(byteCode)
      .setGas(100000)
      .setContractMemo("HelloHedera.sol")
      .setConstructorParameters(new ContractFunctionParameters()
        .addString("Hello from Hedera!"))
      .execute(client);

    const contractReceipt = await contractResponse.getReceipt(client);

    // Get the smart contract ID
    const newContractId = contractReceipt.contractId;
    const newContractAddress = newContractId.toSolidityAddress()
    // console.log("Deployed contract ID is " + newContractId);
    // console.log("Deployed contract Address is " + newContractAddress);

    const solidityFileContent = fs.readFileSync("./test/hedera/HelloHedera.sol");
    const metadataFileContent = fs.readFileSync("./test/hedera/HelloHedera_metadata.json");

    let response

    // Make call to Sourcify to check that contract is not verified
    response = await axios.get(`${SERVER_URL}/check-by-addresses?addresses=${newContractAddress}&chainIds=${chainId}`)
    // console.log(`verification status for contract ${response.data[0].address} is: ${response.data[0].status}`);
    expect(response.data[0].status).to.equal('false');

    // Make call to Sourcify to submit contract verification
    const headers = {"content-type": "application/json"};
    const verificationData = {
      address: newContractAddress, chain: chainId, files: {
        'HelloHedera_metadata.json': metadataFileContent, 'HelloHedera.sol': solidityFileContent,
      }
    }
    response = await axios.post(`${SERVER_URL}/verify`, verificationData, {headers: headers})
    // console.log(`verification response: ${JSON.stringify(response.data)}`);
    expect(response.data.result[0].status).to.equal('perfect');

    // Make call to Sourcify to check that contract is now verified
    response = await axios.get(`${SERVER_URL}/check-by-addresses?addresses=${newContractAddress}&chainIds=${chainId}`)
    // console.log(`verification status for contract ${response.data[0].address} is: ${response.data[0].status}`);
    expect(response.data[0].status).to.equal('perfect');

    return Promise.resolve();
  });

});
