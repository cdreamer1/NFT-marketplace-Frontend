'use client'

import { useEffect, useState } from 'react'
import {
  IconButton,
  Flex,
  HStack,
  Image,
  useColorModeValue,
  Text,
  FlexProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Button,
  useDisclosure,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import {
  // BsCart3,
  BsPersonCircle
} from 'react-icons/bs'
import {
  FiMenu,
  FiChevronDown
} from 'react-icons/fi'
import {
  IoWalletOutline
} from 'react-icons/io5'
import { Address, checksumAddress } from 'viem'
import {
  useAccount,
  useDisconnect,
} from 'wagmi'
import { PriceDataType, usePriceDataStore, useUserStore } from '../../../store/useDataStore'
import marketplaceJson from '@/abis/AlivelandMarketplace.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import Search from '@/components/base/Search/Search'
import ChoosePaymentModal from '@/components/payments/ChoosePayment'
import { MainnetAggregator, TestnetAggregator, TestnetChainID, marketplaceProxyContract, proxyAdminContract } from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { staticPath } from '@/lib/$path'
import { generateIPFSURL } from '@/utils/fetch'

interface NavbarProps extends FlexProps {
  onSideToggle: () => void
};

const MobileNav = ({ onSideToggle, ...rest }: NavbarProps) => {
  const { t } = useTranslation('common');
  const [isConnected, toggleConnection] = useState<boolean>(false);
  const { address, isConnected: isWalletConnected } = useAccount();
  const cAddress = address ? checksumAddress(address as Address) : '0x0';
  const { disconnect } = useDisconnect();
  const { isOpen: isSearchOpen, onOpen: onSearchOpen, onClose: onSearchClose } = useDisclosure();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const setPriceData = usePriceDataStore((state) => state.setPriceData);
  const router = useRouter();
  const { pathname, asPath, query, locale } = router;
  const lang = locale == 'cn' ? 'chinese' : locale == 'ja' ? 'japanese' : 'english';

  useEffect(() => {
    const loadPriceData = async () => {
      try {
        const marketplaceAddress = await readContract({
          address: proxyAdminContract[CHAIN_ID],
          abi: proxyAdminJson.abi,
          functionName: 'getProxyImplementation',
          args: [marketplaceProxyContract[CHAIN_ID]],
        });

        const keys: string[] = Object.keys(CHAIN_ID === TestnetChainID ? TestnetAggregator : MainnetAggregator);
        const values: string[] = Object.values(CHAIN_ID === TestnetChainID ? TestnetAggregator : MainnetAggregator);
        const priceDataPromises: Promise<PriceDataType>[] = keys.map(async (key, index) => {
          const value = values[index];

          const unitPrice = await readContract({
            address: marketplaceAddress as Address,
            abi: marketplaceJson.abi,
            functionName: "getPrice",
            args: [value],
          });

          return { payToken: key, price: Number(unitPrice) / Math.pow(10, 8) } as PriceDataType;
        });

        const priceData: PriceDataType[] = await Promise.all(priceDataPromises);
        setPriceData(priceData);
      } catch (error) {
        console.log(error);
      }
    }

    loadPriceData();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (cAddress !== '0x0') {
        const response = await fetch(`${BACKEND_HOST}api/user/${cAddress}`, {
          method: "GET",
        });
        if (response.status === 200) {
          const resJson = await response.json();
          setUserInfo({
            address: cAddress as Address,
            name: resJson.UserName,
            bannerimg: resJson.BannerImage,
            avatarimg: generateIPFSURL(resJson.AvatarImage || '', 40, 40, 'cover')
          })
        }
      }
    }

    loadUserData();
  }, [isWalletConnected, cAddress]);

  useEffect(() => {
    toggleConnection(isWalletConnected);
  }, [isWalletConnected]);

  return (
    <Flex
      px={{ base: 3.5, md: 3.5 }}
      py={4}
      height={{ base: '3.5rem', md: '4.5rem' }}
      alignItems="center"
      bg={useColorModeValue('black', 'gray.900')}
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent={{ base: 'space-between' }}
      {...rest}>
      <HStack spacing={0}>
        <IconButton
          display={{ base: 'flex', md: 'none' }}
          fontSize={{ base: '1.5rem', md: '3xl' }}
          minWidth={{ base: 8, md: 12 }}
          onClick={onSideToggle}
          variant="ghost"
          aria-label="open menu"
          color="white"
          _hover={{ color: 'whiteAlpha.500' }}
          icon={<FiMenu />}
        />
        <Image src={staticPath.logo_simple_png} alt="Logo" />
        <Image src={staticPath.logo_png} alt="Logo" display={{ base: 'none', md: 'block' }} />
      </HStack>
      <HStack justifyContent="center" flexGrow={1}>
        <Search isSearchOpen={isSearchOpen} onSearchOpen={onSearchOpen} onSearchClose={onSearchClose} />
      </HStack>
      <HStack spacing={{ base: 0, md: 1 }}>
        <Flex alignItems="center">
          {(isConnected) ?
            <Menu>
              <MenuButton
                as={IconButton}
                fontSize={{ base: '1.5rem', md: '3xl' }}
                variant="ghost"
                aria-label="user settings"
                color="white"
                _hover={{ color: 'whiteAlpha.500' }}
                _expanded={{ bg: 'black' }}
                icon={<BsPersonCircle />}
              />
              <MenuList>
                <MenuItem onClick={() => { router.push('/profile') }}>{t('profile')}</MenuItem>
                <MenuDivider />
                <MenuItem onClick={() => { disconnect(); router.push('/') }}>{t('logout')}</MenuItem>
              </MenuList>
            </Menu>
            :
            <IconButton
              fontSize={{ base: '1.5rem', md: '3xl' }}
              boxSize={{ base: 8, md: 12 }}
              minWidth={{ base: 8, md: 12 }}
              variant="ghost"
              aria-label="connect wallet"
              color="white"
              onClick={onModalOpen}
              _hover={{ color: 'whiteAlpha.500' }}
              icon={<IoWalletOutline />}
            />
          }
          {/* Not needed at this stage */}
          {/* <IconButton
            fontSize={{ base: '1.5rem', md: '3xl' }}
            variant="ghost"
            aria-label="open cart"
            color="white"
            _hover={{ color: 'whiteAlpha.500' }}
            icon={<BsCart3 />}
            minWidth={{ base: 8, md: 12 }} /> */}
          <Menu>
            <MenuButton
              as={Button}
              borderRadius="full"
              boxSize={6}
              width={6}
              p={0}
              overflow="hidden"
              display={{ base: 'block', md: 'none' }}
              minWidth={6}>
              <Image src={staticPath.flag_en_svg} alt="Flag" boxSize={6} />
            </MenuButton>
            <MenuButton
              as={Button}
              borderRadius="full"
              rightIcon={<FiChevronDown fontSize="1.5rem" />}
              px={4}
              py={2}
              ml={4}
              display={{ base: 'none', md: 'flex' }}>
              <Text pr={4}>
                {t(lang)}
              </Text>
            </MenuButton>
            <MenuList
              bg={useColorModeValue('white', 'gray.900')}
              borderColor={useColorModeValue('gray.200', 'gray.700')}>
              <MenuItem onClick={() => router.push({ pathname, query }, asPath, { locale: 'en' })}>{t('english')}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => router.push({ pathname, query }, asPath, { locale: 'ja' })}>{t('japanese')}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => router.push({ pathname, query }, asPath, { locale: 'cn' })}>{t('chinese')}</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </HStack>
      {(isConnected) ?
        <></>
        :
        <ChoosePaymentModal onModalClose={onModalClose} isModalOpen={isModalOpen} />
      }
    </Flex>
  );
}

export default MobileNav;