'use client'

import React, { ReactElement, useEffect, useState } from 'react'
import {
  Box,
  Flex,
  Text,
  Grid,
  GridItem,
  CircularProgress,
  Center,
  useToast,
} from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { BsStars } from 'react-icons/bs'
import { createClient, fetchExchange } from 'urql'
import { checksumAddress } from 'viem'
import { useCollectionStore } from '../../../store/useDataStore'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import RecommendedCard from '@/components/base/Cards/Recommended'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { SUBGRAPH_URL } from "@/constants/env";
import { CollectionType, ContractType, UserInfoType } from '@/lib/types'
import { showError } from '@/utils/exceptionHandler'
import { fetchUserList, generateIPFSURL } from '@/utils/fetch'

const Page = () => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const setCollectionList = useCollectionStore((state) => state.setCollectionList);
  const [collections, setCollections] = useState(Array<CollectionType>);
  let userList: Array<UserInfoType> = [];

  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(15);

  const lastPostIndex = currentPage * postsPerPage;
  const firstPostIndex = lastPostIndex - postsPerPage;
  const currentPosts = collections.slice(firstPostIndex, lastPostIndex);

  async function fetchListings() {
    const listingsQuery = `
      query ListingsQuery {
        contractCreateds {
          id
          creator
          nft
          nftType
        }
      }
    `;

    const urqlClient = createClient({
      url: SUBGRAPH_URL,
      exchanges: [fetchExchange]
    });

    const response = await urqlClient.query(listingsQuery, {}).toPromise();
    const listingEntities: ContractType[] = response.data.contractCreateds;

    const tempCollections: Array<CollectionType> = [];
    for (let i = 0; i < listingEntities.length; i++) {
      const metadataUrl = await readContract({
        address: listingEntities[i].nft,
        abi: listingEntities[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
        functionName: 'metadataUrl',
      });

      const totalSupply = await readContract({
        address: listingEntities[i].nft,
        abi: listingEntities[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
        functionName: listingEntities[i].nftType === 'ERC721' ? 'totalSupply' : 'totalItems',
      });

      const resultForMeta = await fetch(metadataUrl as string, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const resultMeta = await resultForMeta.json();

      const bannerImg = generateIPFSURL(resultMeta.banner, 300, 300, 'scale-down');
      const iconImg = generateIPFSURL(resultMeta.icon, 120, 120, 'cover');

      const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(listingEntities[i].creator || '0x0'));

      const tempCollection: CollectionType = {
        name: resultMeta.name,
        symbol: resultMeta.symbol,
        description: resultMeta.description,
        banner: bannerImg,
        icon: iconImg,
        amount: totalSupply === 0 ? '0' : (totalSupply as string).toString(),
        nftType: listingEntities[i].nftType,
        nft: listingEntities[i].nft,
        creator: creatorInfo ? creatorInfo.UserName ? creatorInfo.UserName : 'No name' : listingEntities[i].creator ? `${checksumAddress(listingEntities[i].creator).slice(0, 5)}...${checksumAddress(listingEntities[i].creator).slice(-5)}` : '0x0',
        intro: creatorInfo ? creatorInfo.Introduction : 'Unregisterd user'
      };

      tempCollections.push(tempCollection);
    }

    setCollections(tempCollections);
    setCollectionList(tempCollections);
  }

  useEffect(() => {
    (async () => {
      userList = await fetchUserList();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetchListings();
        setLoading(false);
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [currentPage]);

  return (
    <>
      <Head>
        <title>Collections</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Flex pl="2.5rem" py="1.875rem" bg="bg.header" gap="0.6rem">
        <BsStars size="1.5rem" />
        <Text
          padding="0.125rem 0rem 0rem 0rem"
          fontSize="1.25rem"
          fontWeight={600}
          lineHeight={1}
        >
          {t('collections')}
        </Text>
      </Flex>
      {
        loading ?
          <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
            <CircularProgress color="text.pink" isIndeterminate />
          </Center>
          :
          <Box pb={{ base: '2rem', md: '5rem' }}>
            <Box mb="2rem">
              <Grid
                templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                gap={{ base: 4, md: 10 }}
                rowGap={{ base: 4, md: 7 }}
                p={{ base: 4, md: 10 }}
              >
                {currentPosts.map((elem, index) => {
                  return <GridItem key={index}>
                    <RecommendedCard {...elem} onClick={() => { router.push(`/collection?addr=${elem.nft}`) }} />
                  </GridItem>
                })}
              </Grid>
            </Box>
            <Pagination
              totalPosts={collections.length}
              postsPerPage={postsPerPage}
              setCurrentPage={setCurrentPage}
              currentPage={currentPage}
            />
          </Box>
      }
    </>
  );
};

export async function getStaticProps({ locale }: never) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
};

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
};

export default Page;
