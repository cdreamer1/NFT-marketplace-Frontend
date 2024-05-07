'use client'

import React from 'react'
import { FlexProps, HStack, Modal, ModalBody, ModalContent, ModalOverlay, Image, Text, Box, Divider, Stack, useToast } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import {
  Connector,
  useAccount,
  useConnect,
} from 'wagmi'
import PinkButton from '../base/Buttons/PinkButton'
import { CHAIN_ID } from '@/constants/env'
import { staticPath } from '@/lib/$path'

interface ModalProps extends FlexProps {
  onModalClose: () => void,
  isModalOpen: boolean
};

const ChoosePaymentModal = ({ onModalClose, isModalOpen }: ModalProps) => {
  const { isConnected } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect();
  const [metamask, walletconnect] = connectors;
  const { t } = useTranslation('common');
  const toast = useToast();

  const handleConnect = (connector: Connector) => {
    if (connector.ready) {
      const result = connect({ connector, chainId: CHAIN_ID });
      console.log(result);
    } else {
      toast({
        title: t('please_connect_wallet'),
        status: 'warning',
        isClosable: true,
      });
    }
  }

  return (
    <Modal size="xl" isOpen={isModalOpen} onClose={onModalClose}>
      <ModalOverlay />
      <ModalContent minW="56%" top={{ base: '0%', lg: '16%' }}>
        <ModalBody px={{ base: '0.75rem', lg: '1.875rem' }} py={{ base: '0.6rem', lg: '1.125rem' }}>
          {(isConnected) ?
            <></>
            :
            <>
              <Stack
                px={{ base: '0.75rem', xl: '1.5rem' }}
                py={{ base: '1rem', xl: '2rem' }}
                justify="space-between"
                direction={{ base: 'column', md: 'row' }}
                align="center"
                spacing="0.5rem">
                <HStack spacing={{ base: '0.9rem', lg: '1.875rem' }}>
                  <Image src={staticPath.metamask_png} alt="MetaMask" />
                  <Text fontWeight={600} fontSize="1.25rem">{t('metamask')}</Text>
                </HStack>
                <Box w={{ base: '100%', md: '50%', xl: '43%' }} h="3.5rem">
                  <PinkButton
                    disabled={!metamask.ready}
                    onClick={() => handleConnect(metamask)}
                    isLoading={isLoading && metamask.id === pendingConnector?.id}
                    borderWidth="0.1875rem"
                    fontSize="1rem"
                  >
                    {t('connect_with_metamask')}
                    {!metamask.ready && ' (unsupported)'}
                  </PinkButton>
                </Box>
              </Stack>
              <Divider borderColor="bg.card" />
              <Stack
                px={{ base: '0.75rem', xl: '1.5rem' }}
                py={{ base: '1rem', xl: '2rem' }}
                justify="space-between"
                direction={{ base: 'column', md: 'row' }}
                align="center"
                spacing="0.5rem">
                <HStack spacing={{ base: '0.9rem', lg: '1.875rem' }}>
                  <Image src={staticPath.walletconnect_png} alt="WalletConnect" />
                  <Text fontWeight={600} fontSize="1.25rem">{t('walletconnect')}</Text>
                </HStack>
                <Box w={{ base: '100%', md: '50%', xl: '43%' }} h="3.5rem">
                  <PinkButton
                    disabled={!walletconnect.ready}
                    onClick={() => handleConnect(walletconnect)}
                    isLoading={isLoading && walletconnect.id === pendingConnector?.id}
                    borderWidth="0.1875rem"
                    fontSize="1rem"
                  >
                    {t('connect_with_favorite')}
                    {!walletconnect.ready && ' (unsupported)'}
                    {isLoading &&
                      walletconnect.id === pendingConnector?.id &&
                      ' (connecting)'}
                  </PinkButton>
                </Box>
              </Stack>
              {/* To be implemented in next stage */}
              {/* <Divider borderColor="bg.card" />
              <Stack
                px={{ base: '0.75rem', xl: '1.5rem' }}
                py={{ base: '1rem', xl: '2rem' }}
                justify="space-between"
                direction={{ base: 'column', md: 'row' }}
                align="center"
                spacing="0.5rem">
                <VStack spacing={{ base: '0.6rem', lg: '1.25rem' }}>
                  <Text fontWeight={600} fontSize="1.25rem">{t('login_with_account')}</Text>
                  <Image src={staticPath.paymentcards_png} alt="Payment Cards" />
                </VStack>
                <Box w={{ base: '100%', md: '50%', xl: '43%' }} h="3.5rem">
                  <PinkButton
                    disabled={false}
                    onClick={() => { }}
                    borderWidth="0.1875rem"
                    fontSize="1rem"
                  >
                    {t('purchase_with_credit')}
                  </PinkButton>
                </Box>
              </Stack> */}
              {/* <Text>{error && error.message}</Text> */}
            </>
          }
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ChoosePaymentModal;