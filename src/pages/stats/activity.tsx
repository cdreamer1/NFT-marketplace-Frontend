'use client'

import React, { ReactElement, useState, useEffect } from 'react'
import {
  Container,
  FormControl,
  Box,
  Flex,
  Text,
  TableContainer,
  Table,
  Tbody,
  Thead,
  Td,
  Tr,
  Th,
  Spacer,
  Center,
  CircularProgress,
  useToast
} from '@chakra-ui/react'
import Head from 'next/head'
import { readContract } from '@wagmi/core'
import { OptionBase, Select } from 'chakra-react-select'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { BsReception4 } from 'react-icons/bs'
import { createClient, fetchExchange } from 'urql'
import { checksumAddress } from 'viem'
import erc721Json from '@/abis/AlivelandERC721.json'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { SUBGRAPH_URL } from '@/constants/env'
import { ActivityDataType, ActivityItemType } from '@/lib/types'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'
import { generateIPFSURL } from '@/utils/fetch'

export interface ItemOption extends OptionBase {
  label: string;
  value: string;
  event: string;
}

export const itemOptions: ItemOption[] = [
  { value: 'minted', label: 'Minted', event: 'minted' },
  { value: 'listed', label: 'Listed', event: 'listed' },
  { value: 'auction_created', label: 'AuctionCreated', event: 'auction_created' },
  { value: 'cancel_listing', label: 'CancelListing', event: 'cancel_listing' },
  { value: 'sold', label: 'Sold', event: 'sold' },
  { value: 'bid_placed', label: 'BidPlaced', event: 'bid_placed' },
  { value: 'bid_accepted', label: 'BidAccepted', event: 'bid_accepted' },
  { value: 'cancel_auction', label: 'CancelAuction', event: 'cancel_auction' },
  { value: 'offer_made', label: 'OfferMade', event: 'offer_made' },
  { value: 'offer_accepted', label: 'OfferAccepted', event: 'offer_accepted' },
  { value: 'offer_canceled', label: 'OfferCanceled', event: 'offer_canceled' },
  { value: 'transferred', label: 'Transferred', event: 'transferred' },
];

const Page = () => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [postItems, setPostItems] = useState(Array<ActivityItemType>);
  const [activityItems, setActivityItems] = useState(Array<ActivityItemType>);
  const [postData, setPostData] = useState(Array<ActivityDataType>);
  const [currentPage, setCurrentPage] = useState(0);
  const [postsPerPage] = useState(15);
  const [selectedItem, setSelectedItem] = useState<readonly ItemOption[]>(
    []
  );

  async function fetchActivityItems() {
    try {
      const listingsQuery = `
        query ListingsQuery {
          histories(orderBy: blockTimestamp, orderDirection: desc) {
            nft
            tokenId
            eventType
            pricePerItem
            payToken
            from
            to
            blockTimestamp
          }
        }
      `;
      const urqlClient = createClient({
        url: SUBGRAPH_URL,
        exchanges: [fetchExchange]
      });
      const response = await urqlClient.query(listingsQuery, {}).toPromise();
      const listingEntities: ActivityItemType[] = response.data.histories?.map((elem: ActivityItemType) => {
        return {
          ...elem,
          payToken: checksumAddress(elem.payToken || '0x0'),
          pricePerItem: calculatePrice(elem.pricePerItem, checksumAddress(elem.payToken || '0x0'))
        }
      });
      setActivityItems(listingEntities);
    } catch (error) {
      showError(error, toast, t);
      console.log(error);
    }
  }

  useEffect(() => {
    setTableLoading(true);
    setPostItems(activityItems);
    for (let i = 0; i < selectedItem.length; i++) {
      setPostItems(postItems.filter((obj) => {
        return obj.eventType === selectedItem[i].label;
      }))
    }
    setCurrentPage(1);
    setTableLoading(false);
  }, [selectedItem, activityItems]);

  useEffect(() => {
    (async () => {
      try {
        setTableLoading(true);
        if (postItems.length > 0) {
          const tempGalleryData: Array<ActivityDataType> = [];
          for (let i = ((currentPage - 1) * postsPerPage); i < ((currentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= postItems.length) break;
            const tokenUri = await readContract({
              address: postItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [postItems[i].tokenId]
            });

            const resultForMeta = await fetch(tokenUri as string, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
            });
            const resultMeta = await resultForMeta.json();
            const mainImage = generateIPFSURL(resultMeta.image, 120, 120, 'cover');

            tempGalleryData.push({
              image: mainImage,
              nftName: resultMeta.name,
              event: postItems[i].eventType,
              price: postItems[i].pricePerItem,
              payToken: postItems[i].payToken,
              from: postItems[i].from,
              to: postItems[i].to,
              date: postItems[i].blockTimestamp,
            });
          }
          setPostData(tempGalleryData);
        }
        setTableLoading(false);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [currentPage, postItems]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchActivityItems();
      setCurrentPage(1);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Activity</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {loading ?
        <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
          <CircularProgress color="text.pink" isIndeterminate />
        </Center>
        :
        <>
          <Flex pl="2.5rem" py="1.875rem" bg="bg.header" gap="0.6rem">
            <BsReception4 size="1.5rem" />
            <Text
              padding="0.125rem 0rem 0rem 0rem"
              fontSize="1.25rem"
              fontWeight={600}
              lineHeight={1}
            >
              {t('statistics_activity')}
            </Text>
          </Flex>
          <Box px={{ base: 0, md: '2.5rem' }} pt="2rem" pb={{ base: '2rem', md: '3rem', xl: '7.5rem' }}>
            <Flex>
              <Box />
              <Spacer />
              <Container mb="3.25rem" p={0}>
                <FormControl>
                  <Select
                    isMulti
                    name="category"
                    options={itemOptions}
                    placeholder="Select..."
                    closeMenuOnSelect={false}
                    value={selectedItem}
                    onChange={setSelectedItem}
                  />
                </FormControl>
              </Container>
            </Flex>
            <TableContainer>
              <Table mb={{ base: '2rem', md: '3rem', xl: '6.4375rem' }} fontWeight={500} fontSize="0.875rem" color="text.black">
                <Thead>
                  <Tr>
                    <Th fontSize="1rem" lineHeight={1} borderBottomColor="black" color="text.black">NFT</Th>
                    <Th fontSize="1rem" lineHeight={1} borderBottomColor="black" color="text.black">{t('event')}</Th>
                    <Th fontSize="1rem" lineHeight={1} borderBottomColor="black" color="text.black">{t('price')}</Th>
                    <Th fontSize="1rem" lineHeight={1} borderBottomColor="black" color="text.black">{t('from')}</Th>
                    <Th fontSize="1rem" lineHeight={1} borderBottomColor="black" color="text.black">{t('to')}</Th>
                    <Th fontSize="1rem" lineHeight={1} borderBottomColor="black" color="text.black">{t('date')}</Th>
                  </Tr>
                </Thead>
                {tableLoading ?
                  <Center position="absolute" top="0" left="0" width="100%" height="100%" backgroundColor="bg.overlay" >
                    <CircularProgress color="text.pink" isIndeterminate />
                  </Center>
                  :
                  <Tbody>
                    {postData.length > 0 ?
                      postData.map((item, index) => {
                        return <Tr key={index}>
                          <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.nftName}</Td>
                          <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.event}</Td>
                          <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.price}</Td>
                          <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.from ? `${(item.from).slice(0, 6)}...${(item.from).slice(-4)}` : 'NULL'}</Td>
                          <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.to ? `${(item.to).slice(0, 6)}...${(item.to).slice(-4)}` : 'NULL'}</Td>
                          <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{(new Date(item.date * 1000)).toLocaleString()}</Td>
                        </Tr>
                      })
                      :
                      <Tr>
                        <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{t('no_data')}</Td>
                      </Tr>
                    }
                  </Tbody>
                }
              </Table>
              {(postItems.length > 0) && (!tableLoading) &&
                <Pagination
                  totalPosts={postItems.length}
                  postsPerPage={postsPerPage}
                  setCurrentPage={setCurrentPage}
                  currentPage={currentPage}
                />
              }
            </TableContainer>
          </Box>
        </>
      }
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
