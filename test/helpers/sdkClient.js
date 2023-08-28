const {Client, Hbar, ContractCreateFlow} = require("@hashgraph/sdk");

class SdkClient {

  /**
   * @param {string} network: 'mainnet'|'testnet'|'previewnet'
   * @param {string} accountId: operator account ID (e.g. 0.0.1101)
   * @param {string} privateKey: DER-encoded operator private key
   */
  constructor(network, accountId, privateKey) {
    if (network === 'mainnet') {
      this.client = Client.forMainnet()
      this.chainId = 295
    } else if (network === 'testnet') {
      this.client = Client.forTestnet()
      this.chainId = 296
    } else if (network === 'previewnet'){
      this.client = Client.forPreviewnet()
      this.chainId = 297
    } else { // local
      this.client = Client.forLocalNode()
      this.chainId = 298
    }
    this.client.setOperator(accountId, privateKey)
    this.client.setDefaultMaxTransactionFee(new Hbar(100))
    this.client.setMaxQueryPayment(new Hbar(50))
  }

  getChainId() {
    return this.chainId;
  }

  /**
   *
   * @param {string} bytecode: smart contract bytecode
   * @param {ContractFunctionParameters} parameters: constructor parameters for the contract
   * @param {number} gas: gas to instantiate the contract
   * @param {string} contractMemo: (optional) memo for the contract
   * @returns {ContractId} ID of the deployed contract
   */
  async contractDeploy(bytecode, parameters, gas, contractMemo) {

    // Instantiate the contract
    const contractResponse = await new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(gas)
      .setContractMemo(contractMemo ?? "hedera-sourcify non-regression test contract")
      .setConstructorParameters(parameters)
      .execute(this.client)

    const contractReceipt = await contractResponse.getReceipt(this.client)

    // Get the smart contract ID
    const newContractId = contractReceipt.contractId
    // console.log("Deployed contract ID is " + newContractId)

    return Promise.resolve(newContractId)
  }
}

module.exports = SdkClient
