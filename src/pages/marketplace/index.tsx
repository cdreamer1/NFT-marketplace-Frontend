'use client'

import React, { ReactElement, useCallback, useEffect, useState } from 'react'
import {
  Box,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Center,
  CircularProgress,
  useToast
} from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import PopularCard from '@/components/base/Cards/Popular'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { BACKEND_HOST } from '@/constants/env'
import { SUBGRAPH_URL } from '@/constants/env'
import { DataType, FavoriteType, ListedItemType, TransferType, UserInfoType } from '@/lib/types'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'
import { fetchUserList, generateIPFSURL } from '@/utils/fetch'

const Page = () => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const router = useRouter();
  const { address/*, connector*/, isConnected } = useAccount();
  const cAddress = address ? checksumAddress(address as Address) : '0x0';
  const [userList, setUserList] = useState<Array<UserInfoType>>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [allCurrentPage, setAllCurrentPage] = useState(0);
  const [trendingCurrentPage, setTrendingCurrentPage] = useState(0);
  const [artCurrentPage, setArtCurrentPage] = useState(0);
  const [imageCurrentPage, setImageCurrentPage] = useState(0);
  const [gifCurrentPage, setGifCurrentPage] = useState(0);
  const [videoCurrentPage, setVideoCurrentPage] = useState(0);
  const [musicCurrentPage, setMusicCurrentPage] = useState(0);
  const [postsPerPage] = useState(15);
  const [galleryData, setGalleryData] = useState(Array<DataType>);
  const [trendingData, setTrendingData] = useState(Array<DataType>);
  const [artData, setArtData] = useState(Array<DataType>);
  const [imageData, setImageData] = useState(Array<DataType>);
  const [gifData, setGifData] = useState(Array<DataType>);
  const [videoData, setVideoData] = useState(Array<DataType>);
  const [musicData, setMusicData] = useState(Array<DataType>);
  const [totalItems, setTotalItems] = useState(Array<TransferType>);
  const [listedItems, setListedItems] = useState(Array<ListedItemType>);
  const [artItems, setArtItems] = useState(Array<TransferType>);
  const [imageItems, setImageItems] = useState(Array<TransferType>);
  const [gifItems, setGifItems] = useState(Array<TransferType>);
  const [videoItems, setVideoItems] = useState(Array<TransferType>);
  const [musicItems, setMusicItems] = useState(Array<TransferType>);
  const [favoriteItems, setFavoriteItems] = useState(Array<FavoriteType>);

  async function fetchAllItems() {
    try {
      const listingsQuery = `
				query ListingsQuery {
					transfers(
            orderBy: blockTimestamp, orderDirection: desc) {
						nft
						tokenId
            nftType
						from
						to
					}
				}
			`;
      const urqlClient = createClient({
        url: SUBGRAPH_URL,
        exchanges: [fetchExchange]
      });
      const response = await urqlClient.query(listingsQuery, {}).toPromise();
      let listingEntities: TransferType[] = response.data.transfers;

      let i = 0;
      while (i < listingEntities.length) {
        listingEntities = [...listingEntities.slice(0, i + 1), ...listingEntities.slice(i + 1).filter(elem => elem.nft !== listingEntities[i].nft || elem.tokenId !== listingEntities[i].tokenId)];
        i++;
      }

      const tempArtItems: Array<TransferType> = [];
      const tempImageItems: Array<TransferType> = [];
      const tempGifItems: Array<TransferType> = [];
      const tempVideoItems: Array<TransferType> = [];
      const tempMusicItems: Array<TransferType> = [];
      for (let i = 0; i < listingEntities.length; i++) {
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
        if (resultMeta.mediaType === 'art') {
          tempArtItems.push(listingEntities[i]);
        } else if (resultMeta.mediaType === 'image') {
          tempImageItems.push(listingEntities[i]);
        } else if (resultMeta.mediaType === 'gif') {
          tempGifItems.push(listingEntities[i]);
        } else if (resultMeta.mediaType === 'video') {
          tempVideoItems.push(listingEntities[i]);
        } else if (resultMeta.mediaType === 'music') {
          tempMusicItems.push(listingEntities[i]);
        }
      }

      setArtItems(tempArtItems);
      setImageItems(tempImageItems);
      setGifItems(tempGifItems);
      setVideoItems(tempVideoItems);
      setMusicItems(tempMusicItems);
      setTotalItems(listingEntities);
    } catch (error) {
      showError(error, toast, t);
      console.log(error);
    }
  }

  async function fetchListedItems() {
    try {
      const listingsQuery = `
				query ListingsQuery {
					itemListeds(orderBy: blockTimestamp, orderDirection: desc) {
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
      const listingEntities: ListedItemType[] = response?.data?.itemListeds?.map((elem: ListedItemType) => {
        return { ...elem, payToken: checksumAddress(elem.payToken || '0x0') }
      });;
      setListedItems(listingEntities);
    } catch (error) {
      console.log(error);
    }
  }

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

  useEffect(() => {
    (async () => {
      try {
        if (totalItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((allCurrentPage - 1) * postsPerPage); i < ((allCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= totalItems.length) break;
            const tokenUri = await readContract({
              address: totalItems[i].nft,
              abi: totalItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
              functionName: totalItems[i].nftType === 'ERC721' ? 'tokenURI' : 'uri',
              args: [totalItems[i].tokenId]
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
              address: totalItems[i].nft,
              abi: totalItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
              functionName: 'owner',
            });

            const listedData = listedItems.filter((obj) => {
              return obj.tokenId === totalItems[i].tokenId && obj.nft === totalItems[i].nft;
            });

            const favorData = favoriteItems.filter((obj) => {
              return obj.TokenId == totalItems[i].tokenId && obj.Collection == totalItems[i].nft;
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(totalItems[i]?.to || '0x0'));

            tempGalleryData.push({
              nft: totalItems[i].nft,
              nftType: totalItems[i].nftType,
              tokenId: totalItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: totalItems[i]?.to ? checksumAddress(totalItems[i].to) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
              payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
              amount: listedData.length !== 0 ? listedData[0].quantity : 1,
              startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setGalleryData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [allCurrentPage]);

  useEffect(() => {
    (async () => {
      try {
        if (listedItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((trendingCurrentPage - 1) * postsPerPage); i < ((trendingCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= listedItems.length) break;
            const tokenUri = await readContract({
              address: listedItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [listedItems[i].tokenId]
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
              address: listedItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'owner',
            });

            const favorData = favoriteItems.filter((obj) => {
              return (obj.TokenId == listedItems[i].tokenId) && (obj.Collection == listedItems[i].nft);
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(listedItems[i]?.owner || '0x0'));

            tempGalleryData.push({
              nft: listedItems[i].nft,
              nftType: 'ERC721',
              tokenId: listedItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: listedItems[i]?.owner ? checksumAddress(listedItems[i].owner) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: calculatePrice(listedItems[i].pricePerItem, listedItems[i].payToken || '0x0'),
              payToken: listedItems[i].payToken,
              amount: listedItems[i].quantity,
              startingTime: listedItems[i].startingTime,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setTrendingData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [trendingCurrentPage]);

  useEffect(() => {
    (async () => {
      try {
        if (artItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((artCurrentPage - 1) * postsPerPage); i < ((artCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= artItems.length) break;
            const tokenUri = await readContract({
              address: artItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [artItems[i].tokenId]
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
              address: totalItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'owner',
            });

            const listedData = listedItems.filter((obj) => {
              return (obj.tokenId === totalItems[i].tokenId) && (obj.nft === totalItems[i].nft);
            });

            const favorData = favoriteItems.filter((obj) => {
              return (obj.TokenId == artItems[i].tokenId) && (obj.Collection == artItems[i].nft);
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(artItems[i]?.to || '0x0'));

            tempGalleryData.push({
              nft: artItems[i].nft,
              nftType: artItems[i].nftType,
              tokenId: artItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: artItems[i]?.to ? checksumAddress(artItems[i].to) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
              payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
              amount: listedData.length !== 0 ? listedData[0].quantity : 1,
              startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setArtData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [artCurrentPage]);

  useEffect(() => {
    (async () => {
      try {
        if (imageItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((imageCurrentPage - 1) * postsPerPage); i < ((imageCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= imageItems.length) break;
            const tokenUri = await readContract({
              address: imageItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [imageItems[i].tokenId]
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
              address: imageItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'owner',
            });

            const listedData = listedItems.filter((obj) => {
              return (obj.tokenId === imageItems[i].tokenId) && (obj.nft === imageItems[i].nft);
            });

            const favorData = favoriteItems.filter((obj) => {
              return (obj.TokenId == imageItems[i].tokenId) && (obj.Collection == imageItems[i].nft);
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(imageItems[i]?.to || '0x0'));

            tempGalleryData.push({
              nft: imageItems[i].nft,
              nftType: imageItems[i].nftType,
              tokenId: imageItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: imageItems[i]?.to ? checksumAddress(imageItems[i].to) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
              payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
              amount: listedData.length !== 0 ? listedData[0].quantity : 1,
              startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setImageData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [imageCurrentPage]);

  useEffect(() => {
    (async () => {
      try {
        if (gifItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((gifCurrentPage - 1) * postsPerPage); i < ((gifCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= gifItems.length) break;
            const tokenUri = await readContract({
              address: gifItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [gifItems[i].tokenId]
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
              address: gifItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'owner',
            });

            const listedData = listedItems.filter((obj) => {
              return (obj.tokenId === gifItems[i].tokenId) && (obj.nft === gifItems[i].nft);
            });

            const favorData = favoriteItems.filter((obj) => {
              return (obj.TokenId == gifItems[i].tokenId) && (obj.Collection == gifItems[i].nft);
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(gifItems[i]?.to || '0x0'));

            tempGalleryData.push({
              nft: gifItems[i].nft,
              nftType: gifItems[i].nftType,
              tokenId: gifItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: gifItems[i]?.to ? checksumAddress(gifItems[i].to) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
              payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
              amount: listedData.length !== 0 ? listedData[0].quantity : 1,
              startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setGifData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [gifCurrentPage]);

  useEffect(() => {
    (async () => {
      try {
        if (videoItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((videoCurrentPage - 1) * postsPerPage); i < ((videoCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= videoItems.length) break;
            const tokenUri = await readContract({
              address: videoItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [videoItems[i].tokenId]
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
              address: videoItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'owner',
            });

            const listedData = listedItems.filter((obj) => {
              return (obj.tokenId === videoItems[i].tokenId) && (obj.nft === videoItems[i].nft);
            });

            const favorData = favoriteItems.filter((obj) => {
              return (obj.TokenId == videoItems[i].tokenId) && (obj.Collection == videoItems[i].nft);
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(videoItems[i]?.to || '0x0'));

            tempGalleryData.push({
              nft: videoItems[i].nft,
              nftType: videoItems[i].nftType,
              tokenId: videoItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: videoItems[i]?.to ? checksumAddress(videoItems[i].to) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
              payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
              amount: listedData.length !== 0 ? listedData[0].quantity : 1,
              startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setVideoData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [videoCurrentPage]);

  useEffect(() => {
    (async () => {
      try {
        if (musicItems.length > 0) {
          setTabLoading(true);
          const tempGalleryData: Array<DataType> = [];
          for (let i = ((musicCurrentPage - 1) * postsPerPage); i < ((musicCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
            if (i >= musicItems.length) break;
            const tokenUri = await readContract({
              address: musicItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'tokenURI',
              args: [musicItems[i].tokenId]
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
              address: musicItems[i].nft,
              abi: erc721Json.abi,
              functionName: 'owner',
            });

            const listedData = listedItems.filter((obj) => {
              return (obj.tokenId === musicItems[i].tokenId) && (obj.nft === musicItems[i].nft);
            });

            const favorData = favoriteItems.filter((obj) => {
              return (obj.TokenId == musicItems[i].tokenId) && (obj.Collection == musicItems[i].nft);
            });

            const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
            const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(musicItems[i]?.to || '0x0'));

            tempGalleryData.push({
              nft: musicItems[i].nft,
              nftType: musicItems[i].nftType,
              tokenId: musicItems[i].tokenId,
              name: resultMeta.name,
              nft_desc: resultMeta.description,
              mainImage: mainImage,
              mediaType: resultMeta.mediaType,
              royalty: resultMeta.royalty,
              creator: creator ? checksumAddress(creator as Address) : '0x0',
              creatorImage: creatorInfo?.AvatarImage || '',
              owner: musicItems[i]?.to ? checksumAddress(musicItems[i].to) : '0x0',
              ownerImage: ownerInfo?.AvatarImage || '',
              price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
              payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
              amount: listedData.length !== 0 ? listedData[0].quantity : 1,
              startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
              endTime: 0,
              creatorName: creatorInfo?.UserName || '',
              ownerName: ownerInfo?.UserName || '',
              isFavor: favorData?.length > 0 ? true : false,
            });
          }
          setMusicData(tempGalleryData);
          setTabLoading(false);
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
    })();
  }, [musicCurrentPage]);

  const initAllCurrentPage = (_index: number) => {
    setCurrentTab(_index);
    switch (_index) {
      case 0:
        setAllCurrentPage(1);
        break;
      case 1:
        setTrendingCurrentPage(1);
        break;
      case 2:
        setArtCurrentPage(1);
        break;
      case 3:
        setImageCurrentPage(1);
        break;
      case 4:
        setGifCurrentPage(1);
        break;
      case 5:
        setVideoCurrentPage(1);
        break;
      default:
        setMusicCurrentPage(1);
    }
  }

  const onClickGalleryFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setGalleryData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  const onClickTrendFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setTrendingData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  const onClickArtFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setArtData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  const onClickImageFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setImageData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  const onClickGifFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setGifData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  const onClickVideoFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setVideoData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  const onClickMusicFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
    setMusicData(state => state.map((_dealInfo) => {
      if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
        return { ..._dealInfo, isFavor };
      }
      return _dealInfo;
    }))
  }, []);

  useEffect(() => {
    (async () => {
      switch (currentTab) {
        case 0:
          setGalleryData(updateFavoriteData(galleryData));
          break;
        case 1:
          setTrendingData(updateFavoriteData(trendingData));
          break;
        case 2:
          setArtData(updateFavoriteData(artData));
          break;
        case 3:
          setImageData(updateFavoriteData(imageData));
          break;
        case 4:
          setGifData(updateFavoriteData(gifData));
          break;
        case 5:
          setVideoData(updateFavoriteData(videoData));
          break;
        default:
          setMusicData(updateFavoriteData(musicData));
      }

    })();
  }, [favoriteItems]);

  const updateFavoriteData = (data: Array<DataType>): Array<DataType> => {
    if (data?.length > 0) {
      const tempData: Array<DataType> = [];
      for (let i = 0; i < data.length; i++) {
        const favorData = favoriteItems.filter((obj) => {
          return (obj.TokenId == data[i].tokenId) && (obj.Collection == data[i].nft);
        });
        tempData.push({
          ...data[i],
          isFavor: favorData?.length > 0 ? true : false,
        });
      }
      return tempData;
    } else {
      return [];
    }
  }

  useEffect(() => {
    (async () => {
      if (cAddress !== '0x0') {
        await fetchFavoriteItems();
      }
    })();
  }, [cAddress, isConnected]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setUserList(await fetchUserList());
      await fetchAllItems();
      await fetchListedItems();
      setLoading(false);
      setAllCurrentPage(1);
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Marketplace</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {
        loading ?
          <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
            <CircularProgress color="text.pink" isIndeterminate />
          </Center>
          :
          <Tabs onChange={(index) => { initAllCurrentPage(index) }}>
            <TabList pl={{ base: 0, md: '1.5rem' }} pb="1px" gap={{ base: 0, lg: '1.75rem' }} overflowX={{ base: 'scroll', md: 'hidden' }} overflowY="hidden">
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('all_nfts')}</Tab>
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('trending')}</Tab>
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('art')}</Tab>
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('image')}</Tab>
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('gif')}</Tab>
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('video')}</Tab>
              <Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py="1.1875rem" px={{ base: '0.7rem', sm: '1rem' }}>{t('music')}</Tab>
            </TabList>
            <TabPanels px="1.5rem" pt="1.125rem" pb={{ base: '2rem', lg: '6.125rem' }}>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {galleryData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickGalleryFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={totalItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setAllCurrentPage}
                          currentPage={allCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {trendingData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickTrendFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={listedItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setTrendingCurrentPage}
                          currentPage={trendingCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {artData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickArtFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={artItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setArtCurrentPage}
                          currentPage={artCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {imageData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickImageFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={imageItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setImageCurrentPage}
                          currentPage={imageCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {gifData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickGifFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={gifItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setGifCurrentPage}
                          currentPage={gifCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {videoData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickVideoFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={videoItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setVideoCurrentPage}
                          currentPage={videoCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
              <TabPanel>
                {
                  tabLoading ?
                    <Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
                      <CircularProgress color="text.pink" isIndeterminate />
                    </Center>
                    :
                    <>
                      <Grid
                        templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                        gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
                      >
                        {musicData.map((elem, index) => {
                          return <GridItem key={index}>
                            <PopularCard {...elem} onClickFavor={onClickMusicFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
                          </GridItem>
                        })}
                      </Grid>
                      <Box mb={{ base: '2rem', lg: '6.375rem' }}>
                        <Pagination
                          totalPosts={musicItems.length}
                          postsPerPage={postsPerPage}
                          setCurrentPage={setMusicCurrentPage}
                          currentPage={musicCurrentPage}
                        />
                      </Box>
                    </>
                }
              </TabPanel>
            </TabPanels>
          </Tabs>
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
