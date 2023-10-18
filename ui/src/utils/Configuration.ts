import axios from "axios";

export class Configuration {

    public static CONFIGURATION_URL = `${window.location.origin}/config.json`

    private _serverUrl: string | undefined;
    private _repositoryServerUrl: string | undefined;
    private _repositoryServerUrlFullMatch: string | undefined;
    private _explorerUrl: string | undefined;
    private _brandProductLogoUrl: string | undefined;
    private _termsOfServiceUrl: string | undefined;
    private _remoteImport: boolean | undefined;
    private _githubImport: boolean | undefined;
    private _contractImport: boolean | undefined;
    private _jsonImport: boolean | undefined;
    private _openInRemix: boolean | undefined;
    private _create2Verification: boolean | undefined;
    private _repositoryServerUrlPartialMatch: string | undefined;
    private _ipfsIpnsGatewayUrl: string | undefined;
    private _sessionDataUrl: string | undefined;
    private _addFilesUrl: string | undefined;
    private _addSolcJsonUrl: string | undefined;
    private _addFilesFromContractUrl: string | undefined;
    private _verifyValidatedUrl: string | undefined;
    private _create2VerifyValidatedUrl: string | undefined;
    private _create2CompiledUrl: string | undefined;
    private _restartSessionUrl: string | undefined;

    private _verifyFromEtherscan: string | undefined;

    get restartSessionUrl(): string {
        return this._restartSessionUrl ??  ""
    }
    get create2CompiledUrl(): string {
        return this._create2CompiledUrl ?? ""
    }
    get create2VerifyValidatedUrl(): string {
        return this._create2VerifyValidatedUrl ?? ""
    }
    get verifyValidatedUrl(): string {
        return this._verifyValidatedUrl ?? ""
    }
    get verifyFromEtherscan(): string {
        return this._verifyFromEtherscan ?? ""
    }
    get addFilesFromContractUrl(): string {
        return this._addFilesFromContractUrl ?? ""
    }
    get addSolcJsonUrl(): string {
        return this._addSolcJsonUrl ?? ""
    }
    get addFilesUrl(): string {
        return this._addFilesUrl ?? ""
    }
    get sessionDataUrl(): string {
        return this._sessionDataUrl ?? ""
    }
    get ipfsIpnsGatewayUrl(): string {
        return this._ipfsIpnsGatewayUrl ?? ""
    }
    get repositoryServerUrlPartialMatch(): string {
        return this._repositoryServerUrlPartialMatch ?? ""
    }
    get explorerUrl(): string {
        return this._explorerUrl ?? ""
    }
    get brandProductLogoUrl(): string {
        return this._brandProductLogoUrl ?? ""
    }
    get termsOfServiceUrl(): string {
        return this._termsOfServiceUrl ?? ""
    }
    get repositoryServerUrlFullMatch(): string {
        return this._repositoryServerUrlFullMatch ?? ""
    }
    get repositoryServerUrl(): string {
        return this._repositoryServerUrl ?? ""
    }
    get serverUrl(): string {
        return this._serverUrl ?? ""
    }
    get remoteImport(): boolean {
        return this._remoteImport ?? false
    }
    get githubImport(): boolean {
        return this._githubImport ?? false
    }
    get contractImport(): boolean {
        return this._contractImport ?? false
    }
    get jsonImport(): boolean {
        return this._jsonImport ?? false
    }
    get openInRemix(): boolean {
        return this._openInRemix ?? false
    }
    get create2Verification(): boolean {
        return this._create2Verification ?? false
    }

    public readConfig = async (): Promise<void> =>  {

        // await new Promise<void>((resolve, reject) => {
        //     setTimeout(() => {
        //         resolve()
        //     }, 8000)
        // })
        //
        console.log(`Trying to read config at ${Configuration.CONFIGURATION_URL}`)
        const response = await axios.get<unknown>(Configuration.CONFIGURATION_URL)
        const configData = JSON.parse(JSON.stringify(response.data))

        this._serverUrl = configData.SERVER_URL
        this._repositoryServerUrl = configData.REPOSITORY_SERVER_URL
        this._explorerUrl = configData.EXPLORER_URL
        this._brandProductLogoUrl = configData.BRAND_PRODUCT_LOGO_URL
        this._termsOfServiceUrl = configData.TERMS_OF_SERVICE_URL
        this._remoteImport = configData.REMOTE_IMPORT
        this._githubImport = configData.GITHUB_IMPORT
        this._contractImport = configData.CONTRACT_IMPORT
        this._jsonImport = configData.JSON_IMPORT
        this._openInRemix = configData.OPEN_IN_REMIX
        this._create2Verification = configData.CREATE2_VERIFICATION

        this._repositoryServerUrlFullMatch = `${this._repositoryServerUrl}/contracts/full_match`
        this._repositoryServerUrlPartialMatch = `${this._repositoryServerUrl}/contracts/partial_match`
        this._ipfsIpnsGatewayUrl = `https://cloudflare-ipfs.com/ipns/${configData.IPNS}`

        // SESSION API
        this._sessionDataUrl = `${this._serverUrl}/session/data`;
        this._addFilesUrl = `${this._serverUrl}/session/input-files`;
        this._addSolcJsonUrl = `${this._serverUrl}/session/input-solc-json`;
        this._addFilesFromContractUrl = `${this._serverUrl}/session/input-contract`;
        this._verifyValidatedUrl = `${this._serverUrl}/session/verify-validated`;
        this._verifyFromEtherscan = `${this._serverUrl}/session/verify/etherscan`;

        this._create2VerifyValidatedUrl = `${this._serverUrl}/session/verify/create2`;
        this._create2CompiledUrl = `${this._serverUrl}/session/verify/create2/compile`;
        this._restartSessionUrl = `${this._serverUrl}/session/clear`;

    }
}

export const configuration = new Configuration()
