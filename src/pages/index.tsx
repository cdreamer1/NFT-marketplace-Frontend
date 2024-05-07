'use client'

import React, { ReactElement, useEffect, useState, useCallback } from 'react'
import { Box, Grid, GridItem, Heading, VStack, CircularProgress, Center, Image, useToast } from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import erc721Json from '@/abis/AlivelandERC721.json'
// import LaunchpadCard from '@/components/base/Cards/Launchpad'
import PopularCard from '@/components/base/Cards/Popular'
import RecommendedCard from '@/components/base/Cards/Recommended'
import MainLayout from '@/components/layouts/MainLayout'
import { BACKEND_HOST } from '@/constants/env'
import { SUBGRAPH_URL } from '@/constants/env'
import { staticPath } from '@/lib/$path'
import { CollectionType, DataType, FavoriteType, ListedItemType, TradeVolumeUnitType, UserInfoType } from '@/lib/types'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'
import { fetchUserList, generateIPFSURL } from '@/utils/fetch'

const Page = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { address/*, connector*/, isConnected } = useAccount();
  const cAddress = address ? checksumAddress(address as Address) : '0x0';
  let userList: Array<UserInfoType> = [];
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState(Array<CollectionType>);
  const [popularNFTs, setPopularNFTs] = useState(Array<DataType>);
  const [favoriteItems, setFavoriteItems] = useState(Array<FavoriteType>);
  const toast = useToast();

  const onClickFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setPopularNFTs(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  async function fetchFavoriteItems() {
    try {
      if (isConnected) {
        const res_favorite = await fetch(`${BACKEND_HOST}api/favorite/${cAddress}`, {
          method: "GET",
        });
        const json_favorite = await res_favorite.json();
        setFavoriteItems(json_favorite);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function fetchRecommends() {
    const listingsQuery = `
      query ListingsQuery {
        tradeVolumes(orderBy: value, orderDirection: desc, first: 15) {
          nft
        }
      }
    `;
    const urqlClient = createClient({
      url: SUBGRAPH_URL,
      exchanges: [fetchExchange]
    });
    const response = await urqlClient.query(listingsQuery, {}).toPromise();

    if (response.error) {
      toast({
        title: t('data_load_failed'),
        status: 'error',
        isClosable: true,
      });
      return;
    }

    let listingEntities: TradeVolumeUnitType[] = response.data.tradeVolumes;

    let i = 0;
    while (i < listingEntities.length) {
      listingEntities = [...listingEntities.slice(0, i + 1), ...listingEntities.slice(i + 1).filter(elem => elem.nft !== listingEntities[i].nft)];
      i++;
    }

    if (listingEntities.length > 0) {
      const tempCollections: Array<CollectionType> = [];
      for (let i = 0; i < listingEntities.length; i++) {
        try {
          const totalSupply = await readContract({
            address: listingEntities[i].nft,
            abi: erc721Json.abi,
            functionName: 'totalSupply',
          });

          const metadataUrl = await readContract({
            address: listingEntities[i].nft,
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
          const bannerImg = generateIPFSURL(resultMeta.banner, 300, 300, 'scale-down');
          const iconImg = generateIPFSURL(resultMeta.icon, 120, 120, 'cover');

          const creator = await readContract({
            address: listingEntities[i].nft,
            abi: erc721Json.abi,
            functionName: 'owner',
          });

          const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));

          tempCollections.push({
            name: resultMeta.name,
            symbol: resultMeta.symbol,
            description: resultMeta.description,
            banner: bannerImg,
            icon: iconImg,
            amount: totalSupply === 0 ? '0' : (totalSupply as string).toString(),
            nftType: 'ERC721',
            nft: listingEntities[i].nft,
            creator: creatorInfo ? creatorInfo.UserName ? creatorInfo.UserName : 'No name' : creator ? `${checksumAddress(creator as Address).slice(0, 6)}...${checksumAddress(creator as Address).slice(-4)}` : '0x0',
            intro: creatorInfo ? creatorInfo.Introduction : 'Unregisterd user'
          });
        } catch (error) {
          showError(error, toast, t);
          console.log(error);
        }
      }
      setCollections(tempCollections);
    }
  }

  async function fetchPopularNFTs() {
    const listingsQuery = `
      query ListingsQuery {
        itemListeds(orderBy: blockTimestamp, orderDirection: desc, first: 10) {
          nft
          tokenId
          mediaType
          owner
          quantity
          payToken
          pricePerItem
          startingTime
        }
      }
    `;
    const urqlClient = createClient({
      url: SUBGRAPH_URL,
      exchanges: [fetchExchange]
    });
    const response = await urqlClient.query(listingsQuery, {}).toPromise();
    const listingEntities: ListedItemType[] = response.data.itemListeds;

    if (listingEntities.length > 0) {
      const tempGalleryData: Array<DataType> = [];
      for (let i = 0; i < listingEntities.length; i++) {
        try {
          const tokenUri = await readContract({
            address: listingEntities[i].nft,
            abi: erc721Json.abi,
            functionName: 'tokenURI',
            args: [listingEntities[i].tokenId]
          });
          const resultForMeta = await fetch(tokenUri as string, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });
          const resultMeta = await resultForMeta.json();
          const mainImage = generateIPFSURL(resultMeta.image, 300, 300, 'scale-down');

          const creator = await readContract({
            address: listingEntities[i].nft,
            abi: erc721Json.abi,
            functionName: 'owner',
          });

          const favorData = favoriteItems.filter((obj) => {
            return (obj.TokenId == listingEntities[i].tokenId) && (obj.Collection == listingEntities[i].nft);
          });

          const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
          const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(listingEntities[i].owner || '0x0'));

          tempGalleryData.push({
            nft: listingEntities[i].nft,
            nftType: 'ERC721',
            tokenId: listingEntities[i].tokenId,
            name: resultMeta.name,
            nft_desc: resultMeta.description,
            mainImage: mainImage,
            mediaType: resultMeta.mediaType,
            royalty: resultMeta.royalty,
            creator: creator ? checksumAddress(creator as Address) : '0x0',
            creatorImage: creatorInfo?.AvatarImage || '',
            owner: listingEntities[i].owner ? checksumAddress(listingEntities[i].owner) : '0x0',
            ownerImage: ownerInfo?.AvatarImage || '',
            price: calculatePrice(listingEntities[i].pricePerItem, listingEntities[i].payToken || '0x0'),
            payToken: checksumAddress(listingEntities[i].payToken || '0x0'),
            amount: listingEntities[i].quantity,
            startingTime: listingEntities[i].startingTime,
            endTime: 0,
            creatorName: creatorInfo?.UserName || '',
            ownerName: ownerInfo?.UserName || '',
            isFavor: favorData?.length > 0 ? true : false,
          });
        } catch (error) {
          showError(error, toast, t);
          console.log(error);
        }
      }
      setPopularNFTs(tempGalleryData);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        userList = await fetchUserList();
        await fetchFavoriteItems();
        await fetchRecommends();
        await fetchPopularNFTs();
        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Aliveland NFT Marketplace</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {
        loading ?
          <Center position="absolute" top="0" left="0" width="100%" height="100%" backgroundColor="bg.overlay" >
            <CircularProgress color="text.pink" isIndeterminate />
          </Center>
          :
          <VStack>
            <Box width="100%">
              <Image src={staticPath.metacinderalla_jpg} width="100%" alt="Banner" />
            </Box>
            <Box
              mt={{ base: 4, md: 10 }}
              mb={{ base: 6, md: 15 }}
              w="full">
              <Box pb={{ base: 2, md: 5 }}>
                <Heading
                  as="h2"
                  size="md"
                  bg="bg.header"
                  display="block"
                  px={{ base: 4, md: 10 }}
                  py={2}>
                  {t('recommended')}
                </Heading>
                <Grid
                  templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                  gap={{ base: 2.5, md: 6 }}
                  p={{ base: 4, md: 10 }}>
                  {collections.map((elem, index) => {
                    return <GridItem key={index}>
                      <RecommendedCard {...elem} onClick={() => { router.push(`/collection?addr=${elem.nft}`) }} />
                    </GridItem>
                  })}
                </Grid>
              </Box>
              <Box pb={{ base: 2, md: 5 }}>
                <Heading
                  as="h2"
                  size="md"
                  bg="bg.header"
                  display="block"
                  px={{ base: 4, md: 10 }}
                  py={2}>
                  {t('popular')}
                </Heading>
                <Grid
                  templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                  gap={{ base: 4, md: 10 }}
                  p={{ base: 4, md: 10 }}>
                  {popularNFTs.map((elem, index) => {
                    return <GridItem key={index}>
                      <PopularCard {...elem} onClickFavor={onClickFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                    </GridItem>
                  })}
                </Grid>
              </Box>
            </Box>
          </VStack>
      }
    </>
  )
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
