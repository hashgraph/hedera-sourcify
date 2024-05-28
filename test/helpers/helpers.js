const { ContractFactory, Wallet, BaseContract } = require("ethers");
const chai = require("chai");
const chaiHttp = require("chai-http");

chai.use(chaiHttp);

const invalidAddress = "0x000000bCB92160f8B7E094998Af6BCaD7fa537ff"; // checksum false
const unusedAddress = "0xf1Df8172F308e0D47D0E5f9521a5210467408535";
const unsupportedChain = "3"; // Ropsten

async function deployFromAbiAndBytecode(signer, abi, bytecode, args) {
  const contractFactory = new ContractFactory(abi, bytecode, signer);
  console.log(`Deploying contract ${args?.length ? `with args ${args}` : ""}`);
  const deployment = await contractFactory.deploy(...(args || []));
  await deployment.waitForDeployment();

  const contractAddress = await deployment.getAddress();
  console.log(`Deployed contract at ${contractAddress}`);
  return contractAddress;
}

/**
 * Creator tx hash is needed for tests.
 * This function returns the tx hash in addition to the contract address.
 */
async function deployFromAbiAndBytecodeForCreatorTxHash(
  signer,
  abi,
  bytecode,
  args
) {
  const contractFactory = new ContractFactory(abi, bytecode, signer);
  console.log(`Deploying contract ${args?.length ? `with args ${args}` : ""}`);
  const deployment = await contractFactory.deploy(...(args || []));
  await deployment.waitForDeployment();

  const contractAddress = await deployment.getAddress();
  const creationTx = deployment.deploymentTransaction();
  if (!creationTx) {
    throw new Error(`No deployment transaction found for ${contractAddress}`);
  }
  console.log(
    `Deployed contract at ${contractAddress} with tx ${creationTx.hash}`
  );

  return { contractAddress, txHash: creationTx.hash };
}
/**
 * Function to deploy contracts from an external account with private key
 */
async function deployFromPrivateKey(provider, abi, bytecode, privateKey, args) {
  const signer = new Wallet(privateKey, provider);
  const contractFactory = new ContractFactory(abi, bytecode, signer);
  console.log(`Deploying contract ${args?.length ? `with args ${args}` : ""}`);
  const deployment = await contractFactory.deploy(...(args || []));
  await deployment.waitForDeployment();

  const contractAddress = await deployment.getAddress();
  console.log(`Deployed contract at ${contractAddress}`);
  return contractAddress;
}

/**
 * Await `secs` seconds
 * @param  {Number} secs seconds
 * @return {Promise}
 */
function waitSecs(secs = 0) {
  return new Promise((resolve) => setTimeout(resolve, secs * 1000));
}

// Uses staticCall which does not send a tx i.e. change the state.
async function callContractMethod(
  provider,
  abi,
  contractAddress,
  methodName,
  from,
  args
) {
  const contract = new BaseContract(contractAddress, abi, provider);
  const callResponse = await contract[methodName].staticCall(...args);

  return callResponse;
}

// Sends a tx that changes the state
async function callContractMethodWithTx(
  signer,
  abi,
  contractAddress,
  methodName,
  args
) {
  const contract = new BaseContract(contractAddress, abi, signer);
  const txResponse = await contract[methodName].send(...args);
  const txReceipt = await txResponse.wait();
  return txReceipt;
}

module.exports = {
  deployFromAbiAndBytecode,
  deployFromAbiAndBytecodeForCreatorTxHash,
  deployFromPrivateKey,
  waitSecs,
  callContractMethod,
  callContractMethodWithTx,
  invalidAddress,
  unsupportedChain,
  unusedAddress,
};
