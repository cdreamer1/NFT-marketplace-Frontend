'use client'

import React, { ReactElement, useEffect, useState, useCallback } from 'react'
import {
	Box,
	Grid,
	GridItem,
	Tabs,
	TabList,
	TabPanels,
	Tab,
	TabPanel,
	Image,
	Text,
	Avatar,
	VStack,
	Flex,
	Center,
	useToast,
	CircularProgress,
	TableContainer,
	Table,
	Tbody,
	Thead,
	Td,
	Tr,
	Th,
} from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import { CollectionInfo, useCollectionStore, usePriceDataStore } from '../../../store/useDataStore'
import useStore from '../../../store/useStore'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import PopularCard from '@/components/base/Cards/Popular'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { MaticToken, TokenName } from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { SUBGRAPH_URL } from '@/constants/env'
import { staticPath } from '@/lib/$path'
import { ActivityDataType, ActivityItemType, DataType, FavoriteType, ListedItemType, PriceInfoType, TradeVolumeUnitType, TransferType, UserInfoType } from '@/lib/types'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'
import { fetchUserList, generateIPFSURL } from '@/utils/fetch'

// Used for static path generation
// interface Props {
// 	nft: Address;
// };

// async function fetchCollections() {
// 	const listingsQuery = `
// 		query ListingsQuery {
// 			contractCreateds {
// 				nft
// 			}
// 		}
// 	`;

// 	const urqlClient = createClient({
// 		url: SUBGRAPH_URL,
// 		exchanges: [fetchExchange]
// 	});

// 	const response = await urqlClient.query(listingsQuery, {}).toPromise();
// 	const listingEntities: Props[] = response.data.contractCreateds;

// 	const paths: { params: { address: `0x${string}` }; locale: string }[] = [];
// 	listingEntities.forEach(entity => {
// 		paths.push({ params: { address: entity.nft }, locale: "en" });
// 		paths.push({ params: { address: entity.nft }, locale: "ja" });
// 		paths.push({ params: { address: entity.nft }, locale: "cn" });
// 	});

// 	return paths;
// }

const Page = (/*props: { address: `0x${string}` }*/) => {
	const { t } = useTranslation('common');
	const toast = useToast();
	const router = useRouter();
	const collectionAddress = router.query.addr;
	let userList: Array<UserInfoType> = [];
	const { address, /*connector, */isConnected } = useAccount();
	const cAddress = address ? checksumAddress(address as Address) : '0x0';
	const [loading, setLoading] = useState(true);
	const [tabLoading, setTabLoading] = useState(false);
	const collectionList = useStore(useCollectionStore, (state) => state.collectionList);
	const priceData = useStore(usePriceDataStore, (state) => state.priceData);
	const [collectionInfo, setCollectionInfo] = useState<CollectionInfo>({} as CollectionInfo)
	// const setNFTInfo = useNFTStore((state) => state.setNFTInfo);
	const [owners, setOwners] = useState(0);
	const [floorPrice, setFloorPrice] = useState<PriceInfoType>({ price: 0, payToken: '0x0' });
	const [volumeTraded, setVolumeTraded] = useState(0);
	const [saleData, setSaleData] = useState(Array<DataType>);
	const [galleryData, setGalleryData] = useState(Array<DataType>);
	const [ownedData, setOwnedData] = useState(Array<DataType>);
	const [postsPerPage] = useState(10);
	const [listedItems, setListedItems] = useState(Array<ListedItemType>);
	const [ownedItems, setOwnedItems] = useState(Array<TransferType>);
	const [galleryItems, setGalleryItems] = useState(Array<TransferType>);
	const [saleCurrentPage, setSaleCurrentPage] = useState(0);
	const [ownedCurrentPage, setOwnedCurrentPage] = useState(0);
	const [galleryCurrentPage, setGalleryCurrentPage] = useState(0);
	const [activityCurrentPage, setActivityCurrentPage] = useState(0);
	const [favoriteItems, setFavoriteItems] = useState(Array<FavoriteType>);
	const [activityItems, setActivityItems] = useState(Array<ActivityItemType>);
	const [activityData, setActivityData] = useState(Array<ActivityDataType>);

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

	async function fetchCollectionInfo() {
		let colInfo: CollectionInfo;
		colInfo = collectionList?.find(elem => elem.nft === collectionAddress) || {} as CollectionInfo;

		if (!colInfo.nft) {
			try {
				const colQuery = `
				query colQuery {
					contractCreateds(where: {nft: "${collectionAddress}"}) {
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

				const response = await urqlClient.query(colQuery, {}).toPromise();
				const entity = response.data.contractCreateds[0];

				colInfo = {
					name: '',
					symbol: '',
					description: '',
					banner: '',
					icon: '',
					amount: '0',
					nftType: '',
					nft: '0x0',
					creator: '',
					intro: ''
				};

				if (entity) {
					const metadataUrl = await readContract({
						address: entity.nft,
						abi: entity.nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
						functionName: 'metadataUrl',
					});

					const totalSupply = await readContract({
						address: entity.nft,
						abi: entity.nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
						functionName: entity.nftType === 'ERC721' ? 'totalSupply' : 'totalItems',
					});

					const resultForMeta = await fetch(metadataUrl as string, {
						method: 'GET',
						headers: {
							Accept: 'application/json',
						},
					});
					const resultMeta = await resultForMeta.json();

					const bannerImg = generateIPFSURL(resultMeta.banner, 1000, 0, 'scale-down');
					const iconImg = generateIPFSURL(resultMeta.icon, 300, 300, 'cover');

					const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(entity?.creator || '0x0'));

					colInfo = {
						...colInfo,
						name: resultMeta.name,
						symbol: resultMeta.symbol,
						description: resultMeta.description,
						banner: bannerImg,
						icon: iconImg,
						amount: totalSupply === 0 ? '0' : (totalSupply as string).toString(),
						nftType: entity.nftType,
						nft: entity.nft,
						creator: creatorInfo ? creatorInfo.UserName ? creatorInfo.UserName : 'No name' : entity.creator ? `${checksumAddress(entity.creator).slice(0, 5)}...${checksumAddress(entity.creator).slice(-5)}` : '0x0',
						intro: creatorInfo ? creatorInfo.Introduction : 'Unregisterd user',
					}
				}
			} catch (error) {
				console.log(error);
			}
		}
		setCollectionInfo(colInfo);
	}

	async function fetchListedItems() {
		try {
			const listingsQuery = `
				query ListingsQuery {
					itemListeds(where: {nft: "${collectionAddress}"}) {
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
			const listingEntities: ListedItemType[] = response?.data?.itemListeds.map((elem: ListedItemType) => {
				return { ...elem, payToken: checksumAddress(elem.payToken || '0x0') }
			});

			let floorPrice = 0;
			let tempPriceData: PriceInfoType = { price: 0, payToken: '0x0' };
			for (let i = 0; i < listingEntities.length; i++) {
				const priceInfo = priceData?.filter(info => info.payToken === listingEntities[i].payToken);
				const price = calculatePrice(listingEntities[i].pricePerItem, listingEntities[i].payToken || '0x0') * (priceInfo && priceInfo.length > 0 ? priceInfo[0].price : 0);
				if (price < floorPrice && price > 0) {
					floorPrice = price;
					tempPriceData = { price: calculatePrice(listingEntities[i].pricePerItem, listingEntities[i].payToken || '0x0'), payToken: listingEntities[i].payToken };
				}
			}

			setFloorPrice(tempPriceData);
			setListedItems(listingEntities);
		} catch (error) {
			showError(error, toast, t);
			console.log(error);
		}
	}

	async function fetchOwnedItems() {
		try {
			const transfersQuery = `
				query TransfersQuery {
					transfers(
						where: {nft: "${collectionAddress}"},
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
			const response = await urqlClient.query(transfersQuery, {}).toPromise();
			let transfers: TransferType[] = response.data.transfers;

			let i = 0;
			while (i < transfers.length) {
				transfers = [...transfers.slice(0, i + 1), ...transfers.slice(i + 1).filter(elem => elem.nft !== transfers[i].nft || elem.tokenId !== transfers[i].tokenId)];
				i++;
			}

			setOwnedItems(transfers.filter(elem => checksumAddress(elem.to) === cAddress));
		} catch (error) {
			console.log(error);
		}
	}

	async function fetchGalleryItems() {
		try {
			const transfersQuery = `
				query TransfersQuery {
					transfers(
						where: {nft: "${collectionAddress}"}, 
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
			const response = await urqlClient.query(transfersQuery, {}).toPromise();
			let transfers: TransferType[] = response.data.transfers;

			let i = 0;
			while (i < transfers.length) {
				transfers = [...transfers.slice(0, i + 1), ...transfers.slice(i + 1).filter(elem => elem.nft !== transfers[i].nft || elem.tokenId !== transfers[i].tokenId)];
				i++;
			}
			setOwners(new Set(transfers.map(({ to }) => to)).size);

			setGalleryItems(transfers);
		} catch (error) {
			console.log(error);
		}
	}

	async function fetchTradeVolumes() {
		try {
			const tradeVolumesQuery = `
					query TradeVolumesQuery {
						tradeVolumes(where: {id_starts_with: "${collectionAddress}"}) {
							payToken
							value
						}
					}
				`;
			const urqlClient = createClient({
				url: SUBGRAPH_URL,
				exchanges: [fetchExchange]
			});
			const response = await urqlClient.query(tradeVolumesQuery, {}).toPromise();
			const tradeVolumes: TradeVolumeUnitType[] = response.data.tradeVolumes;
			let volume = 0;
			tradeVolumes.forEach(elem => {
				const currentTokenPriceInfo = priceData?.filter(info => info.payToken === checksumAddress(elem.payToken || '0x0'));
				volume += calculatePrice(elem.value, checksumAddress(elem.payToken || '0x0')) * (currentTokenPriceInfo && currentTokenPriceInfo.length > 0 ? currentTokenPriceInfo[0].price : 0);
			});
			const maticTokenPriceInfo = priceData?.filter(info => info.payToken === MaticToken[CHAIN_ID]);
			setVolumeTraded(Math.round(volume * 100 / (maticTokenPriceInfo && maticTokenPriceInfo.length > 0 ? maticTokenPriceInfo[0].price : 1)) / 100);
		} catch (error) {
			console.log(error);
		}
	}

	async function fetchActivityItems() {
		try {
			const listingsQuery = `
        query ListingsQuery {
          histories(orderBy: blockTimestamp, orderDirection: desc, where: {nft: "${collectionInfo?.nft}"}) {
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
			const listingEntities: ActivityItemType[] = response.data.histories.map((elem: ActivityItemType) => {
				return {
					...elem,
					pricePerItem: calculatePrice(elem.pricePerItem, checksumAddress(elem.payToken || '0x0'))
				}
			});
			setActivityItems(listingEntities);
		} catch (error) {
			console.log(error);
		}
	}

	useEffect(() => {
		(async () => {
			setTabLoading(true);
			try {
				if (activityItems.length > 0) {
					const tempGalleryData: Array<ActivityDataType> = [];
					for (let i = ((activityCurrentPage - 1) * postsPerPage); i < ((activityCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
						if (i >= activityItems.length) break;
						const tokenUri = await readContract({
							address: activityItems[i].nft,
							abi: erc721Json.abi,
							functionName: 'tokenURI',
							args: [activityItems[i].tokenId]
						});

						const resultForMeta = await fetch(tokenUri as string, {
							method: 'GET',
							headers: {
								Accept: 'application/json',
							},
						});
						const resultMeta = await resultForMeta.json();
						const mainImage = generateIPFSURL(resultMeta.image, 300, 0, 'scale-down');

						tempGalleryData.push({
							image: mainImage,
							nftName: resultMeta.name,
							event: activityItems[i].eventType,
							price: activityItems[i].pricePerItem,
							payToken: activityItems[i].payToken,
							from: activityItems[i].from,
							to: activityItems[i].to,
							date: activityItems[i].blockTimestamp,
						});
					}
					setActivityData(tempGalleryData);
				}
			} catch (error) {
				showError(error, toast, t);
				console.log(error);
			}
			setTabLoading(false);
		})();
	}, [activityCurrentPage]);

	useEffect(() => {
		(async () => {
			if (listedItems.length > 0) {
				setTabLoading(true)
				try {
					const tempGalleryData: Array<DataType> = [];
					for (let i = ((saleCurrentPage - 1) * postsPerPage); i < ((saleCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
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
						const mainImage = generateIPFSURL(resultMeta.image, 300, 0, 'scale-down');

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

						const tempGalleryItem = {
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
						}

						tempGalleryData.push(tempGalleryItem);
					}
					setSaleData(tempGalleryData);
				} catch (error) {
					showError(error, toast, t);
					console.log(error);
				}
				setTabLoading(false);
			}
		})();
	}, [saleCurrentPage]);

	useEffect(() => {
		(async () => {
			if (ownedItems.length > 0) {
				setTabLoading(true);
				try {
					const tempGalleryData: Array<DataType> = [];
					for (let i = ((ownedCurrentPage - 1) * postsPerPage); i < ((ownedCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
						if (i >= ownedItems.length) break;
						const tokenUri = await readContract({
							address: ownedItems[i].nft,
							abi: ownedItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
							functionName: ownedItems[i].nftType === 'ERC721' ? 'tokenURI' : 'uri',
							args: [ownedItems[i].tokenId]
						});
						const resultForMeta = await fetch(tokenUri as string, {
							method: 'GET',
							headers: {
								Accept: 'application/json',
							},
						});
						const resultMeta = await resultForMeta.json();
						const mainImage = generateIPFSURL(resultMeta.image, 300, 0, 'scale-down');

						const creator = await readContract({
							address: ownedItems[i].nft,
							abi: ownedItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
							functionName: 'owner',
						});

						const listedData = listedItems.filter((obj) => {
							return (obj.tokenId === ownedItems[i].tokenId) && (obj.nft === ownedItems[i].nft);
						});

						const favorData = favoriteItems.filter((obj) => {
							return (obj.TokenId == ownedItems[i].tokenId) && (obj.Collection == ownedItems[i].nft);
						});

						const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
						const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(ownedItems[i]?.to || '0x0'));

						const tempGalleryItem = {
							nft: ownedItems[i].nft,
							nftType: ownedItems[i].nftType,
							tokenId: ownedItems[i].tokenId,
							name: resultMeta.name,
							nft_desc: resultMeta.description,
							mainImage: mainImage,
							mediaType: resultMeta.mediaType,
							royalty: resultMeta.royalty,
							creator: creator ? checksumAddress(creator as Address) : '0x0',
							creatorImage: creatorInfo?.AvatarImage || '',
							owner: ownedItems[i]?.to ? checksumAddress(ownedItems[i].to) : '0x0',
							ownerImage: ownerInfo?.AvatarImage || '',
							price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
							payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
							amount: listedData.length !== 0 ? listedData[0].quantity : 1,
							startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
							endTime: 0,
							creatorName: creatorInfo?.UserName || '',
							ownerName: ownerInfo?.UserName || '',
							isFavor: favorData?.length > 0 ? true : false,
						};

						tempGalleryData.push(tempGalleryItem);
					}
					setOwnedData(tempGalleryData);
				} catch (error) {
					showError(error, toast, t);
					console.log(error);
				}
				setTabLoading(false);
			}
		})();
	}, [ownedCurrentPage, isConnected, cAddress]);

	useEffect(() => {
		(async () => {
			if (galleryItems?.length > 0) {
				setTabLoading(true);

				const tempGalleryData: Array<DataType> = [];
				for (let i = ((galleryCurrentPage - 1) * postsPerPage); i < ((galleryCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
					let tempGalleryItem = {
						nft: '0x0' as Address,
						nftType: '',
						tokenId: 0,
						name: '',
						nft_desc: '',
						mainImage: '',
						mediaType: '',
						royalty: 0,
						creator: '0x0' as Address,
						creatorImage: '',
						owner: '0x0' as Address,
						ownerImage: '',
						price: 0,
						payToken: '0x0' as Address,
						amount: 1,
						startingTime: 0,
						endTime: 0,
						creatorName: '',
						ownerName: '',
						isFavor: false
					}

					try {
						if (i >= galleryItems.length) break;
						const tokenUri = await readContract({
							address: galleryItems[i].nft,
							abi: galleryItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
							functionName: galleryItems[i].nftType === 'ERC721' ? 'tokenURI' : 'uri',
							args: [galleryItems[i].tokenId]
						});
						const resultForMeta = await fetch(tokenUri as string, {
							method: 'GET',
							headers: {
								Accept: 'application/json',
							},
						});
						const resultMeta = await resultForMeta.json();
						const mainImage = generateIPFSURL(resultMeta.image, 300, 0, 'scale-down');

						const creator = await readContract({
							address: galleryItems[i].nft,
							abi: galleryItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
							functionName: 'owner',
						});

						const listedData = listedItems.filter((obj) => {
							return (obj.tokenId === galleryItems[i].tokenId) && (obj.nft === galleryItems[i].nft);
						});

						const favorData = favoriteItems.filter((obj) => {
							return (obj.TokenId == galleryItems[i].tokenId) && (obj.Collection == galleryItems[i].nft);
						});

						const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
						const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(galleryItems[i]?.to || '0x0'));

						tempGalleryItem = {
							nft: galleryItems[i].nft,
							nftType: galleryItems[i].nftType,
							tokenId: galleryItems[i].tokenId,
							name: resultMeta.name,
							nft_desc: resultMeta.description,
							mainImage: mainImage,
							mediaType: resultMeta.mediaType,
							royalty: resultMeta.royalty,
							creator: creator ? checksumAddress(creator as Address) : '0x0',
							creatorImage: creatorInfo?.AvatarImage || '',
							owner: galleryItems[i]?.to ? checksumAddress(galleryItems[i].to) : '0x0',
							ownerImage: ownerInfo?.AvatarImage || '',
							price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
							payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
							amount: listedData.length !== 0 ? listedData[0].quantity : 1,
							startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
							endTime: 0,
							creatorName: creatorInfo?.UserName || '',
							ownerName: ownerInfo?.UserName || '',
							isFavor: favorData?.length > 0 ? true : false,
						}
					}
					catch (error) {
						showError(error, toast, t);
						console.log(error);
					}
					tempGalleryData.push(tempGalleryItem);
				}
				setGalleryData(tempGalleryData);
				setTabLoading(false);
			}
		})();
	}, [galleryCurrentPage]);

	const onClickFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
		setSaleData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}));

		setOwnedData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}));

		setGalleryData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}));

		if (isFavor) {
			setFavoriteItems([...favoriteItems, {
				Collection: nft,
				TokenId: tokenId,
				UserAddress: cAddress
			}]);
		} else {
			setFavoriteItems(favoriteItems.filter(elem => elem.Collection !== nft && elem.TokenId !== tokenId));
		}
	}, []);

	useEffect(() => {
		(async () => {
			if (collectionAddress) {
				userList = await fetchUserList();
				await fetchCollectionInfo();
				await fetchFavoriteItems();
				await fetchListedItems();
				await fetchGalleryItems();
				await fetchTradeVolumes();
				setLoading(false);
				setSaleCurrentPage(1);
			}
		})();
	}, [collectionAddress]);

	const initAllCurrentPage = async (_index: number) => {
		switch (_index) {
			case 0:
				setSaleCurrentPage(1);
				break;
			case 1:
				if (isConnected) {
					await fetchOwnedItems();
					setOwnedCurrentPage(1);
				} else {
					toast({
						title: t('please_connect_wallet'),
						status: 'warning',
						isClosable: true,
					});
				}
				break;
			case 2:
				setGalleryCurrentPage(1);
				break;
			default:
				setTabLoading(true);
				await fetchActivityItems();
				setActivityCurrentPage(1);
		}
	}

	return (
		<>
			<Head>
				<title>{collectionInfo?.name}</title>
				<meta name="description" content="NFT Marketplace" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Box>
				{
					loading ?
						<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
							<CircularProgress color="text.pink" isIndeterminate />
						</Center>
						:
						<>
							<Image src={collectionInfo?.banner} width="100%" height="17.5rem" bg="bg.card" />
							<Box position="relative" mx={{ base: '0.75rem', lg: '2.5rem' }}>
								<Flex
									position="relative"
									w="100%"
									top="-2.375rem"
									borderRadius="2xl"
									boxShadow="2px 2px 9px 0px #00000040"
									bg="white"
									direction={{ base: 'column', lg: 'row' }}
									gap={3}
									padding="2rem 1.5rem"
								>
									<Box flexGrow={1} px={3} py={1.5}>
										<Avatar src={collectionInfo?.icon} boxSize="11.25rem" bg="text.dark" />
										<Text fontWeight={600} fontSize="2.25rem" lineHeight={1} color="text.black" mt="1.625rem" noOfLines={1}>{collectionInfo?.name}</Text>
									</Box>
									<VStack gap={3.5} align="flex-end" w={{ base: '100%', lg: '53%' }}>
										<Grid
											templateColumns="repeat(4, 1fr)"
											gap={11}
											w="100%"
											textAlign="center"
										>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Text height="50%" fontSize="1.25rem" fontWeight="600" mb="0.5rem" lineHeight={1}>{collectionInfo?.amount}</Text>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>NFTs</Text>
											</Box>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Text height="50%" fontSize="1.25rem" fontWeight="600" mb="0.5rem" lineHeight={1}>{owners}</Text>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>{t('owners')}</Text>
											</Box>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Text height="50%" fontSize="1.25rem" fontWeight="600" mb="0.5rem" lineHeight={1}>{floorPrice.price} {TokenName[floorPrice?.payToken as Address]}</Text>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>{t('floor_price')}</Text>
											</Box>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Center height="50%" width="100%" gap="0.4375rem" mb="0.5rem">
													<Image src={staticPath.polygon_icon_svg} borderRadius="full" width="1.25rem" height="1.25rem" bg="bg.card" />
													<Text fontSize="1.25rem" fontWeight="600" lineHeight={1}>{volumeTraded}</Text>
												</Center>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>{t('volume_traded')}</Text>
											</Box>
										</Grid>
										<Flex width="100%" height="100%" padding="1rem 1.25rem" borderRadius="xl" borderWidth="1px" borderColor="text.dark">
											<Grid
												templateRows="repeat(2, 1fr)"
												gap={4}
											>
												<Box>
													<Text fontWeight={600} fontSize="1.25rem" color="text.black" noOfLines={1}>{collectionInfo?.creator}</Text>
													<Text mt={2} fontWeight={400} fontSize="0.75rem" lineHeight={1} color="text.dark" textAlign="justify" noOfLines={2}>{collectionInfo?.intro}</Text>
												</Box>
												<Box>
													<Text fontWeight={600} fontSize="1.25rem" color="text.black" noOfLines={1}>{collectionInfo?.name}</Text>
													<Text mt={2} fontWeight={400} fontSize="0.75rem" lineHeight={1} color="text.dark" textAlign="justify" noOfLines={5} whiteSpace="pre-line">{collectionInfo?.description}</Text>
												</Box>
											</Grid>
										</Flex>
									</VStack>
								</Flex>
							</Box>
							<Box mx={{ base: '1rem', lg: '3.25rem' }}>
								<Tabs onChange={(index) => { initAllCurrentPage(index) }}>
									<TabList borderWidth={0} pb="2px" gap={{ base: 0, lg: '1.75rem' }} overflowX={{ base: 'scroll', md: 'hidden' }} overflowY="hidden" mb={{ base: 4, lg: 7 }}>
										<Tab
											_selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }}
											fontWeight={600}
											py={4}
											px={{ base: '0.7rem', sm: '1rem' }}
										>{t('onsale')}</Tab>
										<Tab
											_selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }}
											fontWeight={600}
											py={4}
											px={{ base: '0.7rem', sm: '1rem' }}
										>{t('owned')}</Tab>
										<Tab
											_selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }}
											fontWeight={600}
											py={4}
											px={{ base: '0.7rem', sm: '1rem' }}
										>{t('gallery')}</Tab>
										<Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py={4} px={{ base: '0.7rem', sm: '1rem' }}>{t('activity')}</Tab>
									</TabList>
									<TabPanels pb={{ base: '2rem', lg: '8.875rem' }}>
										<TabPanel p={0}>
											{
												tabLoading ?
													<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
														<CircularProgress color="text.pink" isIndeterminate />
													</Center>
													:
													<>
														{saleData.length !== 0 &&
															<Grid
																mb="2rem"
																templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
																gap={{ base: 4, lg: 10 }}
																rowGap={{ base: 4, lg: 7 }}
															>
																{saleData.map((elem, index) => {
																	return <GridItem key={index}>
																		<PopularCard
																			{...elem}
																			onClickFavor={onClickFavor}
																			onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }}
																		/>
																	</GridItem>
																})}
															</Grid>}
														{saleData.length !== 0 &&
															<Pagination
																totalPosts={listedItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setSaleCurrentPage}
																currentPage={saleCurrentPage}
															/>}
														{saleData.length === 0 && t('no_data')}
													</>
											}
										</TabPanel>
										<TabPanel p={0}>
											{
												tabLoading ?
													<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
														<CircularProgress color="text.pink" isIndeterminate />
													</Center>
													:
													<>
														{ownedData.length !== 0 &&
															<Grid
																mb="2rem"
																templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
																gap={{ base: 4, lg: 10 }}
																rowGap={{ base: 4, lg: 7 }}
															>
																{ownedData.map((elem, index) => {
																	return <GridItem key={index}>
																		<PopularCard
																			{...elem}
																			onClickFavor={onClickFavor}
																			onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }}
																		/>
																	</GridItem>
																})}
															</Grid>}
														{ownedData.length !== 0 &&
															<Pagination
																totalPosts={ownedItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setOwnedCurrentPage}
																currentPage={ownedCurrentPage}
															/>}
														{ownedData.length === 0 && t('no_data')}
													</>
											}
										</TabPanel>
										<TabPanel p={0}>
											{
												tabLoading ?
													<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
														<CircularProgress color="text.pink" isIndeterminate />
													</Center>
													:
													<>
														{galleryData.length !== 0 &&
															<Grid
																mb="2rem"
																templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
																gap={{ base: 4, lg: 10 }}
																rowGap={{ base: 4, lg: 7 }}
															>
																{galleryData.map((elem, index) => {
																	return <GridItem key={index}>
																		<PopularCard
																			{...elem}
																			onClickFavor={onClickFavor}
																			onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }}
																		/>
																	</GridItem>
																})}
															</Grid>}
														{galleryData.length !== 0 &&
															<Pagination
																totalPosts={galleryItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setGalleryCurrentPage}
																currentPage={galleryCurrentPage}
															/>}
														{galleryData.length === 0 && t('no_data')}
													</>
											}
										</TabPanel>
										<TabPanel p={0}>
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
													<Tbody>
														{
															tabLoading ?
																<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
																	<CircularProgress color="text.pink" isIndeterminate />
																</Center>
																:
																<>
																	{activityData.length > 0 ? activityData.
																		map((item, index) => {
																			return <Tr key={index}>
																				<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.nftName}</Td>
																				<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{item.event}</Td>
																				<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{calculatePrice(item.price, item.payToken || '0x0')}</Td>
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
																</>
														}
													</Tbody>
												</Table>
											</TableContainer>
											{(activityItems.length > 0) && (!tabLoading) &&
												<Pagination
													totalPosts={activityItems.length}
													postsPerPage={postsPerPage}
													setCurrentPage={setActivityCurrentPage}
													currentPage={activityCurrentPage}
												/>
											}
										</TabPanel>
									</TabPanels>
								</Tabs>
							</Box>
						</>
				}
			</Box>
		</>
	)
}

export async function getStaticProps({ locale/*, params*/ }: { locale: string/*, params: { address: `0x${string}` }*/ }) {
	return {
		props: {
			...(await serverSideTranslations(locale, ['common'])),
			// address: params.address
		},
	};
}

// export async function getStaticPaths() {
// 	const paths = await fetchCollections();
// 	return {
// 		paths,
// 		fallback: true,
// 	}
// }

Page.getLayout = function getLayout(page: ReactElement) {
	return <MainLayout>{page}</MainLayout>
}

export default Page;
