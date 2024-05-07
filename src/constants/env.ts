export const BACKEND_HOST = process.env.backendHost ?? "";
export const WALLET_CONNECT_PROJECT_ID =
  process.env.walletconnectProjectID ?? "";
export const INFURA_API_KEY = process.env.infuraAPIKey ?? "";
export const PINATA_API = process.env.pinataAPI ?? "";
export const PINATA_GATEWAY_API = process.env.pinataGatewayAPI ?? "";
export const PINATA_GATEWAY = process.env.pinataGateway ?? "";
export const SUBGRAPH_URL = process.env.subgraphURL ?? "";
export const CHAIN_ID = parseInt(process.env.chainID ?? "0");
