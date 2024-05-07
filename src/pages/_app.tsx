import { ReactElement, ReactNode } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { appWithTranslation, UserConfig } from 'next-i18next'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { polygon, polygonMumbai } from 'wagmi/chains'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { infuraProvider } from 'wagmi/providers/infura'
import { publicProvider } from 'wagmi/providers/public'
import nextI18NextConfig from '../../next-i18next.config.js'
import customTheme from '@/config/theme'
import { MainnetChainID } from '@/constants/data'
import { CHAIN_ID } from '@/constants/env'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [CHAIN_ID === MainnetChainID ? polygon : polygonMumbai],
  [
    infuraProvider({ apiKey: process.env.infuraAPIKey || '' }),
    publicProvider(),
  ],
);

const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.walletconnectProjectID || '',
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const emptyInitialI18NextConfig: UserConfig = {
  i18n: {
    defaultLocale: nextI18NextConfig.i18n.defaultLocale,
    locales: nextI18NextConfig.i18n.locales,
  },
};

const App = ({ Component, pageProps }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <WagmiConfig config={config}>
      <ChakraProvider theme={customTheme}>
        <main>
          {getLayout(<Component {...pageProps} />)}
        </main>
      </ChakraProvider>
    </WagmiConfig>
  );
};

export default appWithTranslation(App, emptyInitialI18NextConfig);