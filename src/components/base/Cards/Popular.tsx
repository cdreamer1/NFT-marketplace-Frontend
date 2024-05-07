import React from 'react'
import {
  AspectRatio,
  Box,
  Flex,
  VStack,
  Text,
  Image,
  HStack,
  IconButton,
  Tooltip,
  Avatar,
  useToast
} from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import { BsSuitHeart, BsSuitHeartFill } from 'react-icons/bs'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import { MaticToken, USDTToken, WETHToken } from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { staticPath } from '@/lib/$path'

interface Props {
  name: string,
  price: number,
  payToken: Address,
  mainImage: string,
  creatorImage: string,
  ownerImage: string,
  nft: Address,
  tokenId: number,
  creatorName: string,
  ownerName: string,
  isFavor: boolean,
  onClick: () => void,
  onClickFavor: (_nft: Address, _tokenId: number, _isFavor: boolean) => void,
};

export default function PopularCard(info: Props) {
  const { t } = useTranslation('common');
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const cAddress = address ? checksumAddress(address as Address) : '0x0';

  return (
    <Box w="100%" borderRadius="xl" overflow="hidden" boxShadow="2px 2px 9px 0px #00000040" onClick={info.onClick} _hover={{ cursor: 'pointer' }}>
      <AspectRatio ratio={4 / 3} bgImage={info.mainImage} bgRepeat="no-repeat" bgSize="cover" position="relative">
        <Box>
          <IconButton
            position="absolute"
            right={3.5}
            bottom={3.5}
            fontSize="1.375rem"
            boxSize="1.375rem"
            minWidth={6}
            w={6}
            h={6}
            variant="ghost"
            aria-label="like"
            color={info.isFavor ? 'text.pink' : 'black'}
            _hover={{ color: 'whiteAlpha.500' }}
            icon={info.isFavor ? <BsSuitHeartFill /> : <BsSuitHeart />}
            onClick={async (e) => {
              e.stopPropagation();
              if (isConnected) {
                try {
                  if (!info.isFavor) {
                    const result = await fetch(`${BACKEND_HOST}api/favorite`, {
                      headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      },
                      method: "POST",
                      body: JSON.stringify({
                        collection: info.nft,
                        user_address: cAddress,
                        token_id: info.tokenId.toString()
                      }),
                    });

                    if (result.status === 201) {
                      toast({
                        title: t('favorite_add_success'),
                        status: 'success',
                        isClosable: true,
                      });
                      info.onClickFavor(info.nft, info.tokenId, true);
                    } else {
                      toast({
                        title: t('favorite_add_failed'),
                        status: 'error',
                        isClosable: true,
                      });
                    }
                  } else {
                    const result = await fetch(`${BACKEND_HOST}api/favorite`, {
                      headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      },
                      method: "DELETE",
                      body: JSON.stringify({
                        collection: info.nft,
                        user_address: cAddress,
                        token_id: info.tokenId.toString()
                      }),
                    });

                    if (result.status === 200) {
                      toast({
                        title: t('favorite_remove_success'),
                        status: 'success',
                        isClosable: true,
                      });
                      info.onClickFavor(info.nft, info.tokenId, false);
                    } else {
                      toast({
                        title: t('favorite_remove_failed'),
                        status: 'error',
                        isClosable: true,
                      });
                    }
                  }
                } catch (error) {
                  console.log(error);
                  toast({
                    title: t('server_api_error'),
                    status: 'error',
                    isClosable: true,
                  });
                }
              } else {
                toast({
                  title: t('please_connect_wallet'),
                  status: 'warning',
                  isClosable: true,
                });
              }
            }}
          />
        </Box>
      </AspectRatio>
      <Box px={4} pt={3.5} pb={4} position="relative">
        <VStack spacing={3} align="stretch" fontSize="sm" fontWeight={600}>
          <Flex justifyContent="center">
            <Text color="text.black">{info.name}</Text>
          </Flex>
          <Flex justifyContent="space-between" color="text.black">
            <Text color="text.blue" fontSize="xs">{(info.price !== 0) && t('onsale')}</Text>
            <Flex pr={3} gap={2}>
              {info.payToken === MaticToken[CHAIN_ID] ? <Image src={staticPath.polygon_icon_svg} /> : null}
              {info.payToken === USDTToken[CHAIN_ID] ? <Image src={staticPath.usdt_icon_svg} /> : null}
              {info.payToken === WETHToken[CHAIN_ID] ? <Image src={staticPath.eth_icon_svg} /> : null}
              <Text
                bgRepeat="no-repeat"
                color={(info.price !== 0) ? 'text.black' : 'transparent'}>
                {info.price}
              </Text>
            </Flex>
          </Flex>
          <Flex justifyContent="space-between">
            <Image src={staticPath.polygon_icon_svg} alt="ethereum" />
            <HStack spacing={1}>
              <Tooltip label={`creator: ${info.creatorName !== null ? info.creatorName : 'No name'}`} aria-label='A tooltip'>
                <Avatar
                  src={info.creatorImage}
                  overflow="hidden"
                  borderRadius="full"
                  boxSize={5} />
              </Tooltip>
              <Tooltip label={`owner: ${info.ownerName !== null ? info.ownerName : 'No name'}`} aria-label='A tooltip'>
                <Avatar
                  src={info.ownerImage}
                  overflow="hidden"
                  borderRadius="full"
                  boxSize={5} />
              </Tooltip>
            </HStack>
          </Flex>
        </VStack>
      </Box>
    </Box>
  );
}