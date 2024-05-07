/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: i18n.locales,
    defaultLocale: i18n.defaultLocale,
  },
  env: {
    infuraAPIKey: process.env.INFURA_API_KEY,
    walletconnectProjectID: process.env.WALLET_CONNECT_PROJECT_ID,
    backendHost: process.env.BACKEND_HOST,
    pinataAPI: process.env.PINATA_API,
    pinataGatewayAPI: process.env.PINATA_GATEWAY_API,
    pinataGateway: process.env.PINATA_GATEWAY,
    subgraphURL: process.env.SUBGRAPH_URL,
    chainID: process.env.CHAIN_ID
  },
};

module.exports = nextConfig;
