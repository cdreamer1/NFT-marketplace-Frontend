'use client'

import React, { ReactElement, useEffect, useState } from 'react'
import {
  Box,
  Flex,
  HStack,
  Text,
  TableContainer,
  Table,
  Tbody,
  Thead,
  Td,
  Tr,
  Th,
  useRadio,
  useRadioGroup,
  UseRadioProps,
  Center,
  CircularProgress,
  useToast
} from '@chakra-ui/react'
import Head from 'next/head'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { BsReception4 } from 'react-icons/bs'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { usePriceDataStore } from '../../../store/useDataStore'
import useStore from '../../../store/useStore'
import erc721Json from '@/abis/AlivelandERC721.json'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { MaticToken } from '@/constants/data'
import { CHAIN_ID, SUBGRAPH_URL } from '@/constants/env'
import { AuctionResultedType, ItemSoldType, TradeVolumeType } from '@/lib/types'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'

interface Props extends UseRadioProps {
  children?: ReactElement | string;
}

function RadioCard(props: Props) {
  const { getInputProps, getRadioProps } = useRadio(props);

  const input = getInputProps();
  const checkbox = getRadioProps();

  return (
    <Box as="label" borderRadius="2xl">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        width="6.75rem"
        borderWidth="none"
        borderRadius="0.625rem"
        _checked={{
          bg: 'text.green',
          color: 'white',
        }}
        _focus={{
          boxShadow: 'outline',
        }}
        py="0.75rem"
        fontSize="1rem"
        fontWeight={600}
        lineHeight={1}
        textAlign="center"
      >
        {props.children}
      </Box>
    </Box>
  )
}

const Page = () => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [data, setData] = useState<TradeVolumeType[]>([]);
  const priceData = useStore(usePriceDataStore, (state) => state.priceData);

  const lastPostIndex = currentPage * postsPerPage;
  const firstPostIndex = lastPostIndex - postsPerPage;

  const options = [t('7days'), t('30days'), t('all')];
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'duration',
    defaultValue: t('7days'),
    onChange: (val) => { setDays(isNaN(parseInt(val)) ? 0 : parseInt(val)) },
  });
  const group = getRootProps();

  async function fetchTradeVolumes(days: number) {
    try {
      const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
      const prevDateLimit = Math.floor((Date.now() - (days * 2 * oneDay)) / 1000);
      const dateLimit = Math.floor((Date.now() - (days * oneDay)) / 1000);
      const where = days === 0 ? '' : `(where: {blockTimestamp_gt: ${prevDateLimit}})`;
      let query = `
				query SoldsQuery {
					itemSolds ${where} {
            id
            seller
            buyer
            nft
            payToken
            tokenId
            pricePerItem
            blockTimestamp
					}
				}
			`;
      const urqlClient = createClient({
        url: SUBGRAPH_URL,
        exchanges: [fetchExchange]
      });
      let response = await urqlClient.query(query, {}).toPromise();
      const itemSolds: ItemSoldType[] = response.data.itemSolds?.map((elem: ItemSoldType) => {
        return {
          ...elem,
          payToken: checksumAddress(elem.payToken || '0x0'),
          pricePerItem: calculatePrice(elem.pricePerItem, checksumAddress(elem.payToken || '0x0'))
        }
      });

      query = `
				query AuctionsQuery {
					auctionResulteds(where: {blockTimestamp_gt: ${prevDateLimit}}) {
            id
            oldOwner
            winner
            nftAddress
            tokenId
            winningBid
            payToken
            blockTimestamp
					}
				}
			`;
      response = await urqlClient.query(query, {}).toPromise();
      const auctionResulteds: AuctionResultedType[] = response.data.auctionResulteds?.map((elem: AuctionResultedType) => {
        return {
          ...elem,
          payToken: checksumAddress(elem.payToken || '0x0'),
          winningBid: calculatePrice(elem.winningBid, checksumAddress(elem.payToken || '0x0'))
        }
      });

      const tradeVolumes: Record<Address, TradeVolumeType> = {};
      itemSolds.forEach(elem => {
        const tradevolume = tradeVolumes[elem.nft];
        const priceInfo = priceData?.filter(info => info.payToken === elem.payToken);
        const usdPrice = elem.pricePerItem * (priceInfo && priceInfo.length > 0 ? priceInfo[0].price : 0);
        const maticTokenPriceInfo = priceData?.filter(info => info.payToken === MaticToken[CHAIN_ID]);
        const price = Math.round(usdPrice * 100 / (maticTokenPriceInfo && maticTokenPriceInfo.length > 0 ? maticTokenPriceInfo[0].price : 1)) / 100;

        if (tradevolume) {
          if (elem.blockTimestamp > dateLimit) {
            tradeVolumes[elem.nft].count++;
            tradeVolumes[elem.nft].lowest = tradevolume.lowest > price ? price : tradevolume.lowest;
            tradeVolumes[elem.nft].volumes += price;
          } else {
            tradeVolumes[elem.nft].prevVolumes += price;
          }
        } else {
          if (elem.blockTimestamp > dateLimit) {
            const newTradeVolume = {
              count: 1,
              lowest: price,
              volumes: price,
              prevVolumes: 0,
              nft: elem.nft,
              name: ''
            }
            tradeVolumes[elem.nft] = newTradeVolume;
          } else {
            const newTradeVolume = {
              count: 0,
              lowest: 0,
              volumes: 0,
              prevVolumes: price,
              nft: elem.nft,
              name: ''
            }
            tradeVolumes[elem.nft] = newTradeVolume;
          }
        }
      });

      auctionResulteds.forEach(elem => {
        const tradevolume = tradeVolumes[elem.nftAddress];
        const priceInfo = priceData?.filter(info => info.payToken === elem.payToken);
        const usdPrice = elem.winningBid * (priceInfo && priceInfo.length > 0 ? priceInfo[0].price : 0);
        const maticTokenPriceInfo = priceData?.filter(info => info.payToken === MaticToken[CHAIN_ID]);
        const price = Math.round(usdPrice * 100 / (maticTokenPriceInfo && maticTokenPriceInfo.length > 0 ? maticTokenPriceInfo[0].price : 1)) / 100;

        if (tradevolume) {
          if (elem.blockTimestamp > dateLimit) {
            tradeVolumes[elem.nftAddress].count++;
            tradeVolumes[elem.nftAddress].lowest = tradevolume.lowest > price ? price : tradevolume.lowest;
            tradeVolumes[elem.nftAddress].volumes += price;
          } else {
            tradeVolumes[elem.nftAddress].prevVolumes += price;
          }
        } else {
          if (elem.blockTimestamp > dateLimit) {
            const newTradeVolume = {
              count: 1,
              lowest: price,
              volumes: price,
              prevVolumes: 0,
              nft: elem.nftAddress,
              name: ''
            }
            tradeVolumes[elem.nftAddress] = newTradeVolume;
          } else {
            const newTradeVolume = {
              count: 0,
              lowest: 0,
              volumes: 0,
              prevVolumes: price,
              nft: elem.nftAddress,
              name: ''
            }
            tradeVolumes[elem.nftAddress] = newTradeVolume;
          }
        }
      });

      const newTradeVolumes: TradeVolumeType[] = [];

      for (const elem of Object.values(tradeVolumes)) {
        const metadataUrl = await readContract({
          address: elem.nft,
          abi: erc721Json.abi,
          functionName: 'metadataUrl',
        });
        const resultForMeta = await fetch(metadataUrl as string, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });
        const resultMeta = await resultForMeta.json();
        newTradeVolumes.push({ ...elem, name: resultMeta.name });
      }
      setData(newTradeVolumes);
    } catch (error) {
      showError(error, toast, t);
      console.log(error);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchTradeVolumes(days);
      setLoading(false);
    })();
  }, [days]);

  return (
    <>
      <Head>
        <title>Ranking</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Flex pl="2.5rem" py="1.875rem" bg="bg.header" gap="0.6rem">
        <BsReception4 size="1.5rem" />
        <Text
          padding="0.125rem 0rem 0rem 0rem"
          fontSize="1.25rem"
          fontWeight={600}
          lineHeight={1}
        >
          {t('statistics_ranking')}
        </Text>
      </Flex>
      <Box px={{ base: 0, md: '2.5rem' }} pt="2.125rem" pb={{ base: '2rem', md: '3rem', xl: '7.5rem' }}>
        <Flex justify="flex-end">
          <HStack mb="2.125rem" borderColor="text.gray" borderWidth="1px" borderRadius="2xl" padding={3} gap={2.5} {...group}>
            {options.map((value) => {
              const radio = getRadioProps({ value })
              return (
                <RadioCard key={value} {...radio}>
                  {value}
                </RadioCard>
              )
            })}
          </HStack>
        </Flex>
        <TableContainer>
          <Table mb={{ base: '2rem', md: '3rem', xl: '6.4375rem' }} fontWeight={500} fontSize="0.875rem" color="text.black">
            <Thead>
              <Tr>
                <Th py="1.25rem" fontSize="1rem" fontWeight={700} lineHeight={1} borderBottomColor="black" color="text.black">#</Th>
                <Th py="1.25rem" fontSize="1rem" fontWeight={700} lineHeight={1} borderBottomColor="black" color="text.black">{t('collection')}</Th>
                <Th py="1.25rem" fontSize="1rem" fontWeight={700} lineHeight={1} borderBottomColor="black" color="text.black">{t('volume')}</Th>
                <Th py="1.25rem" fontSize="1rem" fontWeight={700} lineHeight={1} borderBottomColor="black" color="text.black">{t('volatility')}(%)</Th>
                <Th py="1.25rem" fontSize="1rem" fontWeight={700} lineHeight={1} borderBottomColor="black" color="text.black">{t('lowest_price')}</Th>
                <Th py="1.25rem" fontSize="1rem" fontWeight={700} lineHeight={1} borderBottomColor="black" color="text.black">{t('sale')}</Th>
              </Tr>
            </Thead>
            {loading ?
              <Center position="absolute" top="0" left="0" width="100%" height="100%" backgroundColor="bg.overlay" zIndex={1000} >
                <CircularProgress color="text.pink" isIndeterminate />
              </Center>
              :
              <Tbody>
                {data
                  .map((item, index) => {
                    return (
                      <Tr key={index + 1} mb="0.625rem">
                        <Td lineHeight={1} border="none">{index + 1}</Td>
                        <Td lineHeight={1} border="none">{item.name}</Td>
                        <Td lineHeight={1} border="none" bg="bg.header">{item.volumes} MATIC</Td>
                        <Td lineHeight={1} border="none" color="text.green">{item.prevVolumes === 0 ? 0 : (item.volumes - item.prevVolumes) * 100.0 / item.prevVolumes} %</Td>
                        <Td lineHeight={1} border="none" bg="bg.header">{item.lowest} MATIC</Td>
                        <Td lineHeight={1} border="none">{item.count}</Td>
                      </Tr>
                    );
                  })
                  .slice(firstPostIndex, lastPostIndex)
                }
              </Tbody>
            }
          </Table>
          {(data.length > 0) &&
            <Pagination
              totalPosts={data.length}
              postsPerPage={postsPerPage}
              setCurrentPage={setCurrentPage}
              currentPage={currentPage}
            />
          }
        </TableContainer>
      </Box>
    </>
  )
}

export async function getStaticProps({ locale }: never) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default Page;
