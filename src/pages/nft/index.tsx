'use client'

import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import {
	Box,
	Grid,
	GridItem,
	Card,
	CardBody,
	Image,
	Text,
	Stack,
	HStack,
	Flex,
	Spacer,
	Accordion,
	AccordionItem,
	AccordionButton,
	AccordionIcon,
	AccordionPanel,
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
	Td,
	TableContainer,
	Divider,
	SimpleGrid,
	Center,
	IconButton,
	useDisclosure,
	Avatar,
	useToast,
	CircularProgress,
	Link
} from '@chakra-ui/react'
import _ from 'lodash'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract, writeContract, waitForTransaction } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { BsSuitHeart, BsSuitHeartFill } from 'react-icons/bs'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import { useNFTStore } from '../../../store/useDataStore'
import useStore from '../../../store/useStore'
import auctionJson from '@/abis/AlivelandAuction.json'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import marketplaceJson from '@/abis/AlivelandMarketplace.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import PopularCard from '@/components/base/Cards/Popular'
import AcceptOffer from '@/components/base/Modals/AcceptOffer'
import EditPrice from '@/components/base/Modals/EditPrice'
import MakeOffer from '@/components/base/Modals/MakeOffer'
import PlaceBid from '@/components/base/Modals/PlaceBid'
import Purchase from '@/components/base/Modals/Purchase'
import Sell from '@/components/base/Modals/Sell'
import MainLayout from '@/components/layouts/MainLayout'
import {
	marketplaceProxyContract,
	proxyAdminContract,
	MainnetAggregator,
	TestnetAggregator,
	TokenName,
	auctionProxyContract,
	TestnetChainID,
	MaticToken, USDTToken, WETHToken
} from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { SUBGRAPH_URL } from '@/constants/env'
import { staticPath } from '@/lib/$path'
import { BidType, DataType, FavoriteType, ListedItemType, NFTMintType, OfferType, PriceInfoType, TradeType, UserInfoType } from '@/lib/types'
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
	const tempAddress: string = (Array.isArray(router.query.addr) ? router.query.addr[0] : router.query.addr) || '0x0';
	const collectionAddress = tempAddress as Address;
	const tempTokenId: string = (Array.isArray(router.query.tokenId) ? router.query.tokenId[0] : router.query.tokenId) || '0';
	const tokenId = parseInt(tempTokenId);
	const { address, /*connector, */isConnected } = useAccount();
	const cAddress = address ? checksumAddress(address as Address) : '0x0';
	const [userList, setUserList] = useState<Array<UserInfoType>>([]);
	const nftInfo = useStore(useNFTStore, (state) => state.nftInfo);
	const setNFTInfo = useNFTStore((state) => state.setNFTInfo);
	const [loading, setLoading] = useState(false);
	const [galleryData, setGalleryData] = useState(Array<DataType>);
	const { isOpen: isPurchaseOpen, onOpen: onPurchaseOpen, onClose: onPurchaseClose } = useDisclosure();
	const { isOpen: isSellOpen, onOpen: onSellOpen, onClose: onSellClose } = useDisclosure();
	const { isOpen: isEditPriceOpen, onOpen: onEditPriceOpen, onClose: onEditPriceClose } = useDisclosure();
	const { isOpen: isMakeOfferOpen, onOpen: onMakeOfferOpen, onClose: onMakeOfferClose } = useDisclosure();
	const { isOpen: isAcceptOfferOpen, onOpen: onAcceptOfferOpen, onClose: onAcceptOfferClose } = useDisclosure();
	const { isOpen: isPlaceBidOpen, onOpen: onPlaceBidOpen, onClose: onPlaceBidClose } = useDisclosure();
	const [isOwner, toggleIsOwner] = useState<boolean>(false);
	const [isListed, toggleIsListed] = useState<boolean>(false);
	const [isBidded, toggleIsBidded] = useState<boolean>(false);
	const [auctionState, setAuctionState] = useState<string>(''); // CREATED, ENDED, AVAILABLE
	const [isOffered, toggleIsOffered] = useState<boolean>(false);
	const [isFavorite, toggleIsFavorite] = useState<boolean>(false);
	const [priceInfo, setPriceInfo] = useState<PriceInfoType>({ price: 0, payToken: '0x0' });
	const [usdPrice, setUsdPrice] = useState(0);
	const [listedItems, setListedItems] = useState(Array<ListedItemType>);
	const [bidHistory, setBidHistory] = useState(Array<BidType>);
	const [offerHistory, setOfferHistory] = useState(Array<OfferType>);
	const [offerSelected, setOfferSelected] = useState<OfferType>();
	const [tradeHistory, setTradeHistory] = useState(Array<TradeType>);
	const [favoriteItems, setFavoriteItems] = useState(Array<FavoriteType>);

	const onClickFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
		setGalleryData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}))
	}, []);

	async function fetchNFTInfo(nftAddress: Address, tokenId: number) {
		try {
			// Get Collection Type (ERC721 or ERC1155)
			const contractInfoQuery = `
				query ListingsQuery {
					contractCreateds(where: {nft: "${nftAddress}"}) {
						nftType
					}
				}
			`;
			const urqlClient = createClient({
				url: SUBGRAPH_URL,
				exchanges: [fetchExchange]
			});
			let response = await urqlClient.query(contractInfoQuery, {}).toPromise();
			const nftType = response.data.contractCreateds[0]?.nftType;

			// Get Creator of NFT
			const transfersQuery = `
				query TransfersQuery {
					transfers(where: {from: "0x0000000000000000000000000000000000000000", nft: "${nftAddress}", tokenId: "${tokenId}"}) {
						to
					}
				}
			`;
			response = await urqlClient.query(transfersQuery, {}).toPromise();
			const creator = response.data.transfers[0]?.to ? checksumAddress(response.data.transfers[0].to) : '0x0';

			// Get NFT info
			const tokenUri = await readContract({
				address: nftAddress,
				abi: nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
				functionName: nftType === 'ERC721' ? 'tokenURI' : 'uri',
				args: [tokenId]
			});
			let resultForMeta = await fetch(tokenUri as string, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
				},
			});
			const resultMeta = await resultForMeta.json();
			const mainImage = generateIPFSURL(resultMeta.image, 300, 300, 'scale-down');

			// Get Collection info
			const metadataUrl = await readContract({
				address: nftAddress,
				abi: nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
				functionName: 'metadataUrl',
			});
			resultForMeta = await fetch(metadataUrl as string, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
				},
			});
			const resultMetaForCollection = await resultForMeta.json();
			const collectionImage = generateIPFSURL(resultMetaForCollection.icon, 120, 120, 'cover');

			const tempOwner = await readContract({
				address: nftAddress,
				abi: nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
				functionName: 'ownerOf',
				args: [tokenId]
			});
			const owner = tempOwner ? checksumAddress(tempOwner as Address) : '0x0';

			const listedData = listedItems.filter((obj) => {
				return (obj.tokenId.toString() === tokenId.toString());
			});

			const favor = favoriteItems.filter((obj) => {
				return (checksumAddress(obj.Collection || '0x0') == checksumAddress(nftAddress || '0x0') && obj.TokenId.toString() == tokenId.toString());
			});
			toggleIsFavorite(favor.length > 0);

			const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator || '0x0'));
			const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(owner || '0x0'));

			if (owner === cAddress)
				toggleIsOwner(true);
			else
				toggleIsOwner(false);

			const nftInfo = {
				nft: nftAddress,
				nftType: nftType,
				tokenId: tokenId,
				name: resultMeta.name,
				nft_desc: resultMeta.description,
				mainImage: mainImage,
				mediaType: resultMeta.mediaType,
				royalty: resultMeta.royalty,
				creator: creator ? checksumAddress(creator) : '0x0',
				creatorImage: creatorInfo?.AvatarImage || '',
				owner: owner ? checksumAddress(owner as Address) : '0x0',
				ownerImage: ownerInfo?.AvatarImage || '',
				price: priceInfo.price,
				payToken: priceInfo.payToken,
				amount: listedData.length !== 0 ? listedData[0].quantity : 1,
				startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
				endTime: 0,
				creatorName: creatorInfo?.UserName || '',
				creatorIntro: creatorInfo?.Introduction || '',
				ownerName: ownerInfo?.UserName || '',
				collectionName: resultMetaForCollection.name || '',
				collectionImage: collectionImage || '',
				isFavor: favor?.length > 0 ? true : false,
			};

			setNFTInfo(nftInfo);
		} catch (error) {
			showError(error, toast, t);
			console.log(error);
		}
	}

	async function fetchListedItems() {
		if (collectionAddress && collectionAddress !== '0x0') {
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
				const listingEntities: ListedItemType[] = response?.data?.itemListeds?.map((elem: ListedItemType) => {
					return { ...elem, payToken: checksumAddress(elem.payToken || '0x0') }
				});;
				setListedItems(listingEntities);
			} catch (error) {
				console.log(error);
			}
		}
	}

	async function fetchFavoriteItems() {
		try {
			if (cAddress !== '0x0') {
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

	async function fetchGallery() {
		if (collectionAddress && collectionAddress !== '0x0') {
			const transfersQuery = `
				query TransfersQuery {
					transfers(
						orderBy: blockTimestamp, orderDirection: desc, 
						where: {
							nft: "${collectionAddress}", 
							tokenId_not: "${tokenId}"}) {
						nft
						nftType
						to
						tokenId
					}
				}
			`;
			const urqlClient = createClient({
				url: SUBGRAPH_URL,
				exchanges: [fetchExchange]
			});
			const response = await urqlClient.query(transfersQuery, {}).toPromise();
			let transfers: NFTMintType[] = response.data.transfers;
			let i = 0;
			while (i < transfers.length) {
				transfers = [...transfers.slice(0, i + 1), ...transfers.slice(i + 1).filter(elem => elem.nft !== transfers[i].nft || elem.tokenId !== transfers[i].tokenId)];
				i++;
			}
			transfers = [...transfers.slice(0, 5)];

			const tempGalleryData: Array<DataType> = [];
			for (let i = 0; i < transfers.length; i++) {
				try {
					const tokenUri = await readContract({
						address: transfers[i].nft,
						abi: transfers[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
						functionName: transfers[i].nftType === 'ERC721' ? 'tokenURI' : 'uri',
						args: [transfers[i].tokenId]
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
						address: transfers[i].nft,
						abi: transfers[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
						functionName: 'owner',
					});

					const listedData = listedItems.filter((obj) => {
						return (obj.tokenId === transfers[i].tokenId);
					});

					const favorData = favoriteItems.filter((obj) => {
						return (obj.TokenId == transfers[i].tokenId) && (obj.Collection == transfers[i].nft);
					});

					const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
					const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(transfers[i].to || '0x0'));

					const tempGalleryItem = {
						nft: transfers[i].nft,
						nftType: transfers[i].nftType,
						tokenId: transfers[i].tokenId,
						name: resultMeta.name,
						nft_desc: resultMeta.description,
						mainImage: mainImage,
						mediaType: resultMeta.mediaType,
						royalty: resultMeta.royalty,
						creator: creator ? checksumAddress(creator as Address) : '0x0',
						creatorImage: creatorInfo?.AvatarImage || '',
						owner: transfers[i]?.to ? checksumAddress(transfers[i].to) : '0x0',
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
				} catch (error) {
					console.log(error);
				}
			}

			setGalleryData(tempGalleryData);
		}
	}

	async function fetchOfferHistory() {
		if (collectionAddress && collectionAddress !== '0x0') {
			const currentTimestamp = Math.ceil(new Date().getTime() / 1000);
			try {
				const offersQuery = `
					query OffersQuery {
						offerCreateds(
							orderBy: pricePerItem, orderDirection: desc, 
							where: {nft: "${collectionAddress}", tokenId: "${tokenId}", deadline_gt: "${currentTimestamp}"}) {
							pricePerItem
							payToken
							creator
							blockTimestamp
							deadline
						}
					}
				`;
				const urqlClient = createClient({
					url: SUBGRAPH_URL,
					exchanges: [fetchExchange]
				});
				const response = await urqlClient.query(offersQuery, {}).toPromise();
				const offers: OfferType[] = response?.data?.offerCreateds?.map((elem: OfferType) => {
					return { ...elem, payToken: checksumAddress(elem.payToken || '0x0') }
				});;
				setOfferHistory(offers);
			} catch (error) {
				console.log(error);
			}
		}
	}

	async function fetchTradeHistory() {
		if (collectionAddress && collectionAddress !== '0x0') {
			try {
				const historiesQuery = `
					query HistoriesQuery {
						histories(orderBy: blockTimestamp, orderDirection: desc, where: {nft: "${collectionAddress}", tokenId: "${tokenId}"}) {
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
				const response = await urqlClient.query(historiesQuery, {}).toPromise();
				const histories: TradeType[] = response.data.histories?.map((elem: TradeType) => {
					return {
						...elem,
						payToken: checksumAddress(elem.payToken || '0x0'),
						pricePerItem: calculatePrice(elem.pricePerItem, checksumAddress(elem.payToken || '0x0'))
					}
				});
				setTradeHistory(histories);
			} catch (error) {
				console.log(error);
			}
		}
	}

	async function fetchBidHistory() {
		if (collectionAddress && collectionAddress !== '0x0') {
			try {
				const bidsQuery = `
					query BidsQuery {
						bidPlaceds(orderBy: bid, orderDirection: desc, where: {nftAddress: "${collectionAddress}", tokenId: "${tokenId}"}) {
							bid
							payToken
							bidder
							blockTimestamp
						}
					}
				`;
				const urqlClient = createClient({
					url: SUBGRAPH_URL,
					exchanges: [fetchExchange]
				});
				const response = await urqlClient.query(bidsQuery, {}).toPromise();
				const bids: BidType[] = response.data.bidPlaceds.map((elem: BidType) => {
					return {
						...elem,
						payToken: checksumAddress(elem.payToken || '0x0'),
						bid: calculatePrice(elem.bid, checksumAddress(elem.payToken || '0x0'))
					}
				});
				setBidHistory(bids);
			} catch (error) {
				console.log(error);
			}
		}
	}

	async function setIsListed() {
		if (collectionAddress && collectionAddress !== '0x0') {
			try {
				const listingsQuery = `
					query ListingsQuery {
						itemListeds(where: {nft: "${collectionAddress}", tokenId: "${tokenId}"}) {
							pricePerItem
							payToken
						}
					}
				`;
				const urqlClient = createClient({
					url: SUBGRAPH_URL,
					exchanges: [fetchExchange]
				});
				const response = await urqlClient.query(listingsQuery, {}).toPromise();

				const listingEntities: { pricePerItem: number, payToken: Address }[] = response.data.itemListeds;
				if (listingEntities.length !== 0) {
					setPriceInfo({ price: calculatePrice(listingEntities[0].pricePerItem, listingEntities[0].payToken || '0x0'), payToken: checksumAddress(listingEntities[0].payToken || '0x0') });
					toggleIsListed(true);
				} else {
					toggleIsListed(false);
				}
			} catch (error) {
				console.log(error);
			}
		}
	}

	async function setIsOffered() {
		if (collectionAddress && collectionAddress !== '0x0' && cAddress !== '0x0') {
			try {
				const offersQuery = `
				query OffersQuery {
					offerCreateds(where: {nft: "${collectionAddress}", tokenId: "${tokenId}", creator: "${cAddress}"}) {
						id
					}
				}
			`;
				const urqlClient = createClient({
					url: SUBGRAPH_URL,
					exchanges: [fetchExchange]
				});
				const response = await urqlClient.query(offersQuery, {}).toPromise();
				response.data?.offerCreateds.length !== 0 ? toggleIsOffered(true) : toggleIsOffered(false);
			} catch (error) {
				console.log(error);
			}
		}
	}

	async function setIsBidded() {
		if (collectionAddress && collectionAddress !== '0x0' && cAddress !== '0x0') {
			try {
				const bidsQuery = `
					query BidsQuery {
						bidPlaceds(orderBy: bid, orderDirection: desc, 
							where: {nftAddress: "${collectionAddress}", tokenId: "${tokenId}"， bidder: "${cAddress}"}) {
							payToken
							bid
							blockTimestamp
						}
					}
				`;
				const urqlClient = createClient({
					url: SUBGRAPH_URL,
					exchanges: [fetchExchange]
				});
				const response = await urqlClient.query(bidsQuery, {}).toPromise();
				toggleIsBidded(response.data?.bidPlaceds?.length !== 0)
			} catch (error) {
				console.log(error);
			}
		}
	}

	// async function setIsAuctionCreated() {
	async function setInitialAuctionState() {
		if (collectionAddress && collectionAddress !== '0x0') {
			// Check auction is still on
			try {
				const auctionsQuery = `
				query AuctionsQuery {
					auctionCreateds(where: {nftAddress: "${collectionAddress}", tokenId: "${tokenId}"}) {
						reservePrice
						payToken
						endTime
					}
				}
			`;
				const urqlClient = createClient({
					url: SUBGRAPH_URL,
					exchanges: [fetchExchange]
				});
				const response = await urqlClient.query(auctionsQuery, {}).toPromise();
				const auctions: { reservePrice: number, payToken: Address, endTime: number }[] = response.data.auctionCreateds;

				if (auctions.length !== 0) {
					setPriceInfo({ price: calculatePrice(auctions[0].reservePrice, auctions[0].payToken || '0x0'), payToken: checksumAddress(auctions[0].payToken || '0x0') });
					if (Math.ceil(new Date().getTime() / 1000) > auctions[0].endTime + 43200) {
						setAuctionState('AVAILABLE');
					} else if (Math.ceil(new Date().getTime() / 1000) > auctions[0].endTime) {
						setAuctionState('ENDED');
					} else {
						setAuctionState('CREATED');
					}
				} else {
					setAuctionState('');
				}
			} catch (error) {
				console.log(error);
				showError(error, toast, t);
			}
		}
	}

	const onClickFavorite = useMemo(() => {
		return _.debounce(async () => {
			if (isConnected && nftInfo && nftInfo.nft !== '0x0') {
				try {
					if (!isFavorite) {
						const response = await fetch(`${BACKEND_HOST}api/favorite`, {
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json'
							},
							method: "POST",
							body: JSON.stringify({
								collection: nftInfo.nft,
								user_address: cAddress,
								token_id: nftInfo.tokenId
							}),
						});

						if (response.status === 201) {
							toast({
								title: t('favorite_add_success'),
								status: 'success',
								isClosable: true,
							});
							toggleIsFavorite(true);
						} else {
							toast({
								title: t('favorite_add_failed'),
								status: 'error',
								isClosable: true,
							});
						}
					} else {
						const response = await fetch(`${BACKEND_HOST}api/favorite`, {
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json'
							},
							method: "DELETE",
							body: JSON.stringify({
								collection: nftInfo.nft,
								user_address: cAddress,
								token_id: nftInfo.tokenId
							}),
						});

						if (response.status === 200) {
							toast({
								title: t('favorite_remove_success'),
								status: 'success',
								isClosable: true,
							});
							toggleIsFavorite(false);
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
					showError(error, toast, t);
				}
			} else {
				toast({
					title: t('please_connect_wallet'),
					status: 'warning',
					isClosable: true,
				});
			}
		}, 450);
	}, [t, isConnected, isFavorite, nftInfo]);

	const onClickCancelList = useCallback(async () => {
		try {
			if (nftInfo && nftInfo.nft !== '0x0') {
				setLoading(true);
				const marketplaceAddress = await readContract({
					address: proxyAdminContract[CHAIN_ID],
					abi: proxyAdminJson.abi,
					functionName: 'getProxyImplementation',
					args: [marketplaceProxyContract[CHAIN_ID]],
				});

				const { hash } = await writeContract({
					address: marketplaceAddress as Address,
					abi: marketplaceJson.abi,
					functionName: 'cancelListing',
					args: [
						nftInfo.nft,
						nftInfo.tokenId,
					],
				});
				await waitForTransaction({ hash });

				const { hash: hash_approve } = await writeContract({
					address: nftInfo.nft || '0x0',
					abi: nftInfo.nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
					functionName: 'setApprovalForAll',
					args: [
						marketplaceAddress,
						false
					],
				});
				await waitForTransaction({ hash: hash_approve });

				toast({
					title: t('listing_canceled'),
					status: 'success',
					isClosable: true,
				});
				toggleIsListed(false);

				await fetchTradeHistory();

				setLoading(false);
			}
		} catch (error) {
			console.log(error);
			toast({
				title: t('listing_cancel_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
		}
	}, [t, isConnected, nftInfo]);

	const onClickEdit = useCallback(() => {
		onEditPriceOpen();
	}, []);

	const onClickSell = useCallback(() => {
		if (isConnected) {
			onSellOpen();
		} else {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		}
	}, [t, isConnected]);

	const onClickBuy = useCallback(() => {
		if (isConnected) {
			onPurchaseOpen();
		} else {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		}
	}, [t, isConnected]);

	const onClickMakeOffer = useCallback(() => {
		if (isConnected) {
			onMakeOfferOpen();
		} else {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		}
	}, [t, isConnected]);

	const onClickCancelOffer = useCallback(async () => {
		try {
			if (nftInfo && nftInfo.nft !== '0x0') {
				setLoading(true);
				const marketplaceAddress = await readContract({
					address: proxyAdminContract[CHAIN_ID],
					abi: proxyAdminJson.abi,
					functionName: 'getProxyImplementation',
					args: [marketplaceProxyContract[CHAIN_ID]],
				});

				const { hash } = await writeContract({
					address: marketplaceAddress as Address,
					abi: marketplaceJson.abi,
					functionName: 'cancelOffer',
					args: [
						nftInfo.nft,
						nftInfo.tokenId,
					],
				});
				await waitForTransaction({ hash });

				toast({
					title: t('offer_canceled'),
					status: 'success',
					isClosable: true,
				});
				toggleIsOffered(false);

				await fetchTradeHistory();

				setLoading(false);
			}
		} catch (error) {
			toast({
				title: t('offer_cancel_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
	}, [t, isConnected, nftInfo]);

	const onClickResultAuction = useCallback(async () => {
		try {
			if (nftInfo && nftInfo.nft !== '0x0') {
				setLoading(true);
				const auctionContractAddress = await readContract({
					address: proxyAdminContract[CHAIN_ID],
					abi: proxyAdminJson.abi,
					functionName: 'getProxyImplementation',
					args: [auctionProxyContract[CHAIN_ID]],
				});

				const { hash } = await writeContract({
					address: auctionContractAddress as Address,
					abi: auctionJson.abi,
					functionName: 'resultAuction',
					args: [
						nftInfo.nft,
						nftInfo.tokenId,
					],
				});
				await waitForTransaction({ hash });

				toast({
					title: t('auction_settled'),
					status: 'success',
					isClosable: true,
				});
				toggleIsListed(false);
				setAuctionState('');

				await fetchTradeHistory();

				setLoading(false);
			}
		} catch (error) {
			toast({
				title: t('auction_settle_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
	}, [t, isConnected, nftInfo]);

	const onClickWithdrawBid = useCallback(async () => {
		try {
			if (nftInfo && nftInfo.nft !== '0x0') {
				setLoading(true);
				const auctionContractAddress = await readContract({
					address: proxyAdminContract[CHAIN_ID],
					abi: proxyAdminJson.abi,
					functionName: 'getProxyImplementation',
					args: [auctionProxyContract[CHAIN_ID]],
				});

				const { hash } = await writeContract({
					address: auctionContractAddress as Address,
					abi: auctionJson.abi,
					functionName: 'withdrawBid',
					args: [
						nftInfo.nft,
						nftInfo.tokenId,
					],
				});
				await waitForTransaction({ hash });

				toast({
					title: t('bid_withdrawn'),
					status: 'success',
					isClosable: true,
				});
				toggleIsListed(false);
				setAuctionState('');
				setLoading(false);
			}
		} catch (error) {
			toast({
				title: t('bid_withdrawal_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
	}, [t, isConnected, nftInfo]);

	const onClickCancelAuction = useCallback(async () => {
		try {
			if (nftInfo && nftInfo.nft !== '0x0') {
				setLoading(true);
				const auctionContractAddress = await readContract({
					address: proxyAdminContract[CHAIN_ID],
					abi: proxyAdminJson.abi,
					functionName: 'getProxyImplementation',
					args: [auctionProxyContract[CHAIN_ID]],
				});

				const { hash } = await writeContract({
					address: auctionContractAddress as Address,
					abi: auctionJson.abi,
					functionName: 'cancelAuction',
					args: [
						nftInfo.nft,
						nftInfo.tokenId,
					],
				});
				await waitForTransaction({ hash });

				toast({
					title: t('auction_canceled'),
					status: 'success',
					isClosable: true,
				});

				toggleIsListed(false);
				setAuctionState('');

				await fetchTradeHistory();

				setLoading(false);
			}
		} catch (error) {
			toast({
				title: t('auction_cancel_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
	}, [t, isConnected, nftInfo]);

	const onClickBid = useCallback(() => {
		if (isConnected) {
			onPlaceBidOpen();
		} else {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		}
	}, [t, isConnected]);

	const ButtonGroup = useMemo(() => {
		// eslint-disable-next-line react/display-name
		return () => {
			if (nftInfo && nftInfo.nft !== '0x0') {
				if (isOwner) {
					if (auctionState !== '') {
						return (
							<Box w="100%" h="3.25rem">
								{auctionState === "CREATED" ? (
									<PinkButton
										isLoading={false}
										fontSize="1.25rem"
										borderWidth="0.1875rem"
										disabled={!isConnected}
										onClick={onClickCancelAuction}
									>
										{t("cancel_auction")}
									</PinkButton>
								) : (auctionState === "ENDED" || auctionState === "AVAILABLE") ? (
									<PinkButton
										isLoading={false}
										fontSize="1.25rem"
										borderWidth="0.1875rem"
										disabled={!isConnected}
										onClick={onClickResultAuction}
									>
										{t("result_auction")}
									</PinkButton>
								) : <></>}
							</Box>
						);
					} else if (isListed) {
						return <Grid
							templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
							gap={{ base: '1rem', xl: '1.25rem' }}
							h={{ base: '8.25rem', lg: '3.5rem' }}
							w="100%"
						>
							<PinkButton
								isLoading={false}
								fontSize="1.25rem"
								borderWidth="0.1875rem"
								disabled={!isConnected}
								onClick={onClickCancelList}
							>
								{t('cancel_listing')}
							</PinkButton>
							<PinkButton
								isLoading={false}
								fontSize="1.25rem"
								borderWidth="0.1875rem"
								disabled={!isConnected}
								onClick={onClickEdit}
							>
								{t('edit_price')}
							</PinkButton>
						</Grid>
					} else {
						return <Box w="100%" h="3.25rem">
							<PinkButton
								isLoading={false}
								fontSize="1.25rem"
								borderWidth="0.1875rem"
								disabled={!isConnected}
								onClick={onClickSell}
							>
								{t('sell')}
							</PinkButton>
						</Box>
					}
				} else {
					if (isListed) {
						return <Grid
							templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
							gap={{ base: '1rem', xl: '1.25rem' }}
							h={{ base: '8.25rem', lg: '3.5rem' }}
							w="100%"
						>
							<PinkButton
								isLoading={false}
								fontSize="1.25rem"
								borderWidth="0.1875rem"
								disabled={!isConnected}
								onClick={onClickBuy}
							>
								{t('buy')}
							</PinkButton>
							{!isOffered ? <PinkButton
								isLoading={false}
								fontSize="1.25rem"
								borderWidth="0.1875rem"
								disabled={!isConnected}
								onClick={onClickMakeOffer}
							>
								{t('make_offer')}
							</PinkButton>
								:
								<Box w="100%">
									<PinkButton
										isLoading={false}
										fontSize="1.25rem"
										borderWidth="0.1875rem"
										disabled={!isConnected}
										onClick={onClickCancelOffer}
									>
										{t('cancel_offer')}
									</PinkButton>
								</Box>}
						</Grid>
					} else if (auctionState === 'ENDED' || auctionState === 'AVAILABLE') {
						if (isBidded) {
							return <Box w="100%">
								<PinkButton
									isLoading={false}
									fontSize="1.25rem"
									borderWidth="0.1875rem"
									disabled={!isConnected || auctionState === 'ENDED'}
									onClick={onClickWithdrawBid}
								>
									{t('withdraw_bid')}
								</PinkButton>
							</Box>
						} else {
							return <Box w="100%">
								<PinkButton
									isLoading={false}
									fontSize="1.25rem"
									borderWidth="0.1875rem"
									disabled
								>
									{t('auction_ended')}
								</PinkButton>
							</Box>
						}
					} else if (auctionState === 'CREATED') {
						if (isBidded) {
							return <Box w="100%">
								<PinkButton
									isLoading={false}
									fontSize="1.25rem"
									borderWidth="0.1875rem"
									disabled
								>
									{t('bid_placed')}
								</PinkButton>
							</Box>
						} else {
							return <Box w="100%">
								<PinkButton
									isLoading={false}
									fontSize="1.25rem"
									borderWidth="0.1875rem"
									disabled={!isConnected}
									onClick={onClickBid}
								>
									{t('place_bid')}
								</PinkButton>
							</Box>
						}
					} else {
						return !isOffered ?
							<Box w="100%">
								<PinkButton
									isLoading={false}
									fontSize="1.25rem"
									borderWidth="0.1875rem"
									disabled={!isConnected}
									onClick={onClickMakeOffer}
								>
									{t('make_offer')}
								</PinkButton>
							</Box>
							:
							<Box w="100%">
								<PinkButton
									isLoading={false}
									fontSize="1.25rem"
									borderWidth="0.1875rem"
									disabled={!isConnected}
									onClick={onClickCancelOffer}
								>
									{t('cancel_offer')}
								</PinkButton>
							</Box>
					}
				}
			}
			else {
				return <></>
			}
		}
	}, [
		t,
		isOwner,
		isListed,
		auctionState,
		isOffered,
		isBidded,
		nftInfo,
		onClickCancelList,
		onClickEdit,
		onClickSell,
		onClickBuy,
		onClickMakeOffer,
		onClickBid,
		onClickCancelOffer,
		onClickCancelAuction
	]);

	useEffect(() => {
		(async () => {
			if (priceInfo?.price > 0) {
				try {
					const marketplaceAddress = await readContract({
						address: proxyAdminContract[CHAIN_ID],
						abi: proxyAdminJson.abi,
						functionName: 'getProxyImplementation',
						args: [marketplaceProxyContract[CHAIN_ID]],
					});
					const unitPrice = await readContract({
						address: marketplaceAddress as Address,
						abi: marketplaceJson.abi,
						functionName: 'getPrice',
						args: CHAIN_ID === TestnetChainID ? [TestnetAggregator[priceInfo.payToken]] : [MainnetAggregator[priceInfo.payToken]],
					});
					setUsdPrice(priceInfo.price * Number(unitPrice) / Math.pow(10, 8));
				} catch (error) {
					console.log(error);
				}
			}
		})();
	}, [priceInfo]);

	useEffect(() => {
		(async () => {
			if (collectionAddress && collectionAddress != '0x0') {
				setLoading(true);
				await fetchListedItems();
				await fetchOfferHistory();
				await fetchBidHistory();
				await fetchTradeHistory();
				await setIsListed();
				await setInitialAuctionState();
				setUserList(await fetchUserList());
			}
		})();
	}, [collectionAddress, tokenId]);

	useEffect(() => {
		(async () => {
			if (cAddress !== '0x0') {
				await fetchFavoriteItems();

				if (collectionAddress && collectionAddress != '0x0') {
					await setIsOffered();
					await setIsBidded();
				}

				if (nftInfo && nftInfo.owner === cAddress)
					toggleIsOwner(true);
				else
					toggleIsOwner(false);
			}
		})();
	}, [cAddress]);

	useEffect(() => {
		(async () => {
			if (isBidded) {
				if (auctionState === 'ENDED') {
					toast({
						title: t('won_ended'),
						status: 'success',
						isClosable: true,
					});
				} else if (auctionState === 'AVAILABLE') {
					toast({
						title: t('won_available'),
						status: 'success',
						isClosable: true,
					});
				}
			}
		})();
	}, [isBidded, auctionState]);

	useEffect(() => {
		(async () => {
			if (favoriteItems && nftInfo && nftInfo.nft !== '0x0' && userList && userList.length > 0) {
				const favor = favoriteItems.filter((obj) => {
					return (checksumAddress(obj.Collection || '0x0') == checksumAddress(nftInfo.nft || '0x0') && obj.TokenId.toString() == nftInfo.tokenId.toString());
				});
				toggleIsFavorite(favor.length > 0);

				setNFTInfo({
					...nftInfo,
					nft: nftInfo?.nft || '0x0',
					nftType: nftInfo?.nftType || '',
					tokenId: nftInfo?.tokenId || 0,
					name: nftInfo?.name || '',
					mediaType: nftInfo?.mediaType || '',
					creator: nftInfo?.creator || '0x0',
					creatorImage: nftInfo?.creatorImage || '',
					creatorName: nftInfo?.creatorName || '',
					price: nftInfo?.price || 0,
					royalty: nftInfo?.royalty || 0,
					payToken: nftInfo?.payToken || '0x0',
					creatorIntro: nftInfo?.creatorIntro || '',
					collectionName: nftInfo?.collectionName || '',
					collectionImage: nftInfo?.collectionImage || '',
					owner: nftInfo?.owner || '0x0',
					ownerName: nftInfo?.ownerName || '',
					ownerImage: nftInfo?.ownerImage || '',
					isFavor: favor?.length > 0 ? true : false,
				});

				const tempGalleryData: Array<DataType> = [];
				for (let i = 0; i < galleryData.length; i++) {
					const favorData = favoriteItems.filter((obj) => {
						return (obj.TokenId == galleryData[i].tokenId) && (obj.Collection == galleryData[i].nft);
					});
					tempGalleryData.push({
						...galleryData[i],
						isFavor: favorData?.length > 0 ? true : false,
					});
				}
				setGalleryData(tempGalleryData);
			}
		})();
	}, [favoriteItems]);

	useEffect(() => {
		(async () => {
			if (userList?.length > 0 && collectionAddress !== '0x0') {
				await fetchGallery();
				await fetchNFTInfo(collectionAddress, tokenId);
				setLoading(false);
			}
		})();
	}, [userList]);

	return (
		<>
			<Head>
				<title>{nftInfo ? nftInfo.name : 'NFT details'}</title>
				<meta name="description" content="NFT Marketplace" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Box
				padding={{ base: '0.5rem 0.5rem 2rem 0.5rem', lg: '2.625rem 2.5rem 2.5rem 2.5rem' }}
			>
				{loading
					?
					<Center position="absolute" top="0" left="0" width="100%" height="100%" backgroundColor="bg.overlay" zIndex={1000} >
						<CircularProgress color="text.pink" isIndeterminate />
					</Center>
					:
					<SimpleGrid
						columns={3}
						spacing={{ base: '1.5rem', xl: '2.5rem 3.375rem' }}
					>
						<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }} mb={{ base: '0rem', lg: '1.625rem' }}>
							<Center>
								<Image objectFit="cover" src={nftInfo ? nftInfo.mainImage : ''} />
							</Center>
						</GridItem>
						<GridItem rowSpan={1} colSpan={{ base: 3, lg: 2 }} mb={{ base: '0rem', lg: '1.625rem' }}>
							<Flex direction="column" height="100%">
								<Flex direction={{ base: 'column', sm: 'row' }} gap={{ base: '0.5rem', md: '1.5rem', lg: '3rem' }} mb={{ base: '1rem', lg: '0rem' }}>
									<HStack gap="0.625rem">
										<Avatar borderRadius="full" boxSize="2.25rem" bg="text.dark" src={nftInfo?.creatorImage} />
										<Box>
											<Text fontSize="0.75rem" fontWeight={400} lineHeight={1}>{t('creator')}</Text>
											<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.black" noOfLines={1}>{nftInfo?.creatorName}</Text>
										</Box>
									</HStack>
									<HStack gap="0.625rem">
										<Avatar borderRadius="full" boxSize="2.25rem" bg="text.dark" src={nftInfo?.collectionImage} />
										<Box>
											<Text fontSize="0.75rem" fontWeight={400} lineHeight={1}>{t('collection')}</Text>
											<Link href={`/collection?addr=${nftInfo?.nft}`} fontSize="1rem" fontWeight={600} lineHeight={1} color="text.blue">{nftInfo?.collectionName}</Link>
										</Box>
									</HStack>
									<HStack gap="0.625rem">
										<Avatar borderRadius="full" boxSize="2.25rem" bg="text.dark" src={nftInfo?.ownerImage} />
										<Box>
											<Text fontSize="0.75rem" fontWeight={400} lineHeight={1}>{t('owner')}</Text>
											<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.black">{nftInfo?.ownerName}</Text>
										</Box>
									</HStack>
								</Flex>
								<Spacer />
								<Text fontWeight={600} fontSize="2.25rem" lineHeight={1} color="text.black" mb={{ base: '0.5rem', lg: '0rem', xl: '1.5rem' }}>{nftInfo ? nftInfo.name : ''}</Text>
								<Text fontWeight={400} fontSize="1.25rem" lineHeight={1} color="text.black" textAlign="justify" mb={{ base: '1rem', lg: '0rem' }} noOfLines={5} whiteSpace="pre-line">{nftInfo?.nft_desc}</Text>
								<Spacer />
								{(isListed || auctionState !== '') &&
									<HStack mb={{ base: '0.5rem', lg: '0rem', xl: '1rem' }}>
										{priceInfo?.payToken === MaticToken[CHAIN_ID] ? <Image borderRadius="full" boxSize="2.25rem" src={staticPath.polygon_icon_svg} /> : null}
										{priceInfo?.payToken === USDTToken[CHAIN_ID] ? <Image borderRadius="full" boxSize="2.25rem" src={staticPath.usdt_icon_svg} /> : null}
										{priceInfo?.payToken === WETHToken[CHAIN_ID] ? <Image borderRadius="full" boxSize="2.25rem" src={staticPath.eth_icon_svg} /> : null}
										<Text bg="gradient.pink" bgClip="text" fontSize="2rem" fontWeight={600} lineHeight={1}>{priceInfo?.price}</Text>
										<Text color="text.gray" fontSize="2rem" fontWeight={600} lineHeight={1}>{TokenName[priceInfo?.payToken as Address]}</Text>
										<Text color="text.dark" fontSize="1rem" fontWeight={400} lineHeight={1}>（${usdPrice.toFixed(2)}）</Text>
									</HStack>
								}
								<Flex width="100%" gap={{ base: '1rem', xl: '1.25rem' }}>
									<ButtonGroup />
									{!isOwner && <IconButton
										isRound={true}
										variant="outline"
										aria-label="Like"
										w="3.5rem"
										h="3.25rem"
										borderWidth="3px"
										borderColor={isFavorite ? 'text.pink' : 'text.dark'}
										color={isFavorite ? 'text.pink' : 'text.dark'}
										fontSize="1.75rem"
										// icon={<BsSuitHeart color={isFavorite ? 'text.pink' : 'black'} />}
										icon={isFavorite ? <BsSuitHeartFill /> : <BsSuitHeart />}
										onClick={onClickFavorite}
									/>}
								</Flex>
							</Flex>
						</GridItem>
						<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
							<Flex gap={{ base: '2rem', xl: '3.375rem' }}>
								<Card w="100%" borderRadius="lg" borderWidth="1px" borderColor="text.dark">
									<CardBody>
										<Stack gap="1rem">
											<Box>
												<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
													{t('creator')}
												</Text>
												<Divider borderColor="black" size="1px" mt="0.625rem" />
												<HStack>
													<Avatar borderRadius="full" boxSize="2.25rem" bg="text.dark" my="1rem" src={nftInfo?.creatorImage} />
													<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.black">{nftInfo?.creatorName}</Text>
												</HStack>
												<Text fontWeight={400} fontSize="0.75rem" lineHeight={1} noOfLines={3} whiteSpace="pre-line">{nftInfo?.creatorIntro}</Text>
											</Box>
											<Box>
												<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
													{t('details')}
												</Text>
												<Divider borderColor="black" size="1px" mt="0.625rem" />
												<HStack>
													<Avatar borderRadius="full" boxSize="2.25rem" bg="text.dark" my="1rem" src={nftInfo?.collectionImage} />
													<Link href={`/collection?addr=${nftInfo?.nft}`} fontSize="1rem" fontWeight={600} lineHeight={1} color="text.blue">{nftInfo?.collectionName}</Link>
												</HStack>
												<Flex fontSize="0.75rem" color="text.black" mb="0.75rem">
													<Text fontWeight={400}>{t('contract_address')}</Text>
													<Spacer />
													<Text fontWeight={500} textAlign="right" noOfLines={1}>{`${nftInfo?.nft?.slice(0, 6)}...${nftInfo?.nft?.slice(-4)}`}</Text>
												</Flex>
												<Flex fontSize="0.75rem" color="text.black" mb="0.75rem">
													<Text fontWeight={400}>{t('token_id')}</Text>
													<Spacer />
													<Text fontWeight={500} textAlign="right">{nftInfo?.tokenId}</Text>
												</Flex>
												<Flex fontSize="0.75rem" color="text.black" mb="0.75rem">
													<Text fontWeight={400}>{t('token_standard')}</Text>
													<Spacer />
													<Text fontWeight={500} textAlign="right">{nftInfo?.nftType}</Text>
												</Flex>
												<Flex fontSize="0.75rem" color="text.black">
													<Text fontWeight={400}>{t('blockchain_type')}</Text>
													<Spacer />
													<Text fontWeight={500} textAlign="right">Polygon</Text>
												</Flex>
											</Box>
										</Stack>
									</CardBody>
								</Card>
							</Flex>
						</GridItem>
						<GridItem rowSpan={1} colSpan={{ base: 3, lg: 2 }}>
							<Flex direction="column" height="100%" gap="1.5rem">
								<Accordion defaultIndex={[0]} allowMultiple height="100%">
									<AccordionItem borderRadius="lg" borderWidth="1px" borderColor="text.dark">
										<AccordionButton padding="0.9375rem 1.25rem">
											<Box flex="1" textAlign="left" color="text.black" fontSize="1.125rem" fontWeight={700} lineHeight={1}>
												{t('offers')}
											</Box>
											<AccordionIcon />
										</AccordionButton>
										<AccordionPanel pb={4} borderTopWidth="1px" borderTopColor="text.dark">
											<TableContainer overflowY="auto" maxHeight="11rem">
												<Table>
													<Thead>
														<Tr>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('price')}</Th>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('from')}</Th>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('date')}</Th>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('expiration')}</Th>
														</Tr>
													</Thead>
													<Tbody>
														{
															offerHistory.length !== 0 ? offerHistory.map((offer, index) => {
																return <Tr key={index} onClick={nftInfo?.owner === cAddress ? () => { setOfferSelected(offer); onAcceptOfferOpen() } : () => { }} _hover={nftInfo?.owner === cAddress ? { cursor: 'pointer' } : {}}>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{calculatePrice(offer.pricePerItem, offer.payToken || '0x0')} {TokenName[offer.payToken]}</Td>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{(offer.creator).slice(0, 6)}...{(offer.creator).slice(-4)}</Td>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{(new Date(offer.blockTimestamp * 1000)).toLocaleString()}</Td>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{(new Date(offer.deadline * 1000)).toLocaleString()}</Td>
																</Tr>
															})
																:
																<Tr>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{t('no_data')}</Td>
																</Tr>
														}
													</Tbody>
												</Table>
											</TableContainer>
										</AccordionPanel>
									</AccordionItem>
								</Accordion>
								<Accordion defaultIndex={[0]} allowMultiple height="100%">
									<AccordionItem borderRadius="lg" borderWidth="1px" borderColor="text.dark">
										<AccordionButton padding="0.9375rem 1.25rem">
											<Box flex="1" textAlign="left" color="text.black" fontSize="1.125rem" fontWeight={700} lineHeight={1}>
												{t('bid_history')}
											</Box>
											<AccordionIcon />
										</AccordionButton>
										<AccordionPanel pb={4} borderTopWidth="1px" borderTopColor="text.dark">
											<TableContainer overflowY="auto" maxHeight="11rem">
												<Table variant='simple'>
													<Thead>
														<Tr>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('price')}</Th>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('from')}</Th>
															<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('date')}</Th>
															{/* <Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('expiration')}</Th> */}
														</Tr>
													</Thead>
													<Tbody>
														{
															bidHistory.length !== 0 ? bidHistory?.map((bid, index) => {
																return <Tr key={index}>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{bid.bid} {TokenName[priceInfo.payToken]}</Td>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{bid.bidder ? `${(bid.bidder).slice(0, 6)}...${(bid.bidder).slice(-4)}` : 'NULL'}</Td>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{(new Date(bid.blockTimestamp * 1000)).toLocaleString()}</Td>
																	{/* <Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{bid.expiration}</Td> */}
																</Tr>
															})
																:
																<Tr>
																	<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{t('no_data')}</Td>
																</Tr>
														}
													</Tbody>
												</Table>
											</TableContainer>
										</AccordionPanel>
									</AccordionItem>
								</Accordion>
							</Flex>
						</GridItem>
						<GridItem colSpan={3}>
							<Accordion defaultIndex={[0]} allowMultiple>
								<AccordionItem borderRadius="lg" borderWidth="1px" borderColor="text.dark">
									<AccordionButton padding="0.9375rem 1.25rem">
										<Box flex="1" textAlign="left" color="text.black" fontSize="1.125rem" fontWeight={700} lineHeight={1}>
											{t('trading_history')}
										</Box>
										<AccordionIcon />
									</AccordionButton>
									<AccordionPanel pb={4} borderTopWidth="1px" borderTopColor="text.dark">
										<TableContainer overflowY="auto" maxHeight="13.75rem">
											<Table>
												<Thead>
													<Tr>
														<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('event')}</Th>
														<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('price')}</Th>
														<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('from')}</Th>
														<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('to')}</Th>
														<Th fontWeight={700} fontSize="1rem" lineHeight={1} color="text.black" borderBottomWidth="1px" borderBottomColor="black">{t('date')}</Th>
													</Tr>
												</Thead>
												<Tbody>
													{
														tradeHistory.length !== 0 ? tradeHistory?.map((trade, index) => {
															return <Tr key={index}>
																<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{trade.eventType}</Td>
																<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{trade.pricePerItem} {TokenName[trade.payToken]}</Td>
																<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{trade.from ? `${(trade.from).slice(0, 6)}...${(trade.from).slice(-4)}` : 'NULL'}</Td>
																<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{trade.to ? `${(trade.to).slice(0, 6)}...${(trade.to).slice(-4)}` : 'NULL'}</Td>
																<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{(new Date(trade.blockTimestamp * 1000)).toLocaleString()}</Td>
															</Tr>
														})
															:
															<Tr>
																<Td fontWeight={400} fontSize="1rem" lineHeight={1} color="text.black" borderBottom="none">{t('no_data')}</Td>
															</Tr>
													}
												</Tbody>
											</Table>
										</TableContainer>
									</AccordionPanel>
								</AccordionItem>
							</Accordion>
						</GridItem>
						<GridItem colSpan={3}>
							<Accordion defaultIndex={[0]} allowMultiple>
								<AccordionItem borderRadius="lg" borderWidth="1px" borderColor="text.dark">
									<AccordionButton padding="0.9375rem 1.25rem">
										<Text flex="1" textAlign="left" color="text.black" fontSize="1.125rem" fontWeight={700} lineHeight={1}>
											{t('view_more')}
										</Text>
										<AccordionIcon />
									</AccordionButton>
									<AccordionPanel
										px={{ base: '1.25rem', lg: '2rem' }}
										pt={{ base: '1rem', lg: '1.75rem' }}
										pb={{ base: '1rem', lg: '2.75rem' }}
										borderTopWidth="1px"
										borderTopColor="text.dark"
									>
										<Grid
											templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
											gap={{ base: '1rem', lg: '1.5rem', xl: '1.875rem' }}
											pb={{ base: '2rem', xl: '3rem' }}
										>
											{galleryData.map((elem, index) => {
												if (index < 5) {
													return <GridItem key={index}>
														<PopularCard
															{...elem}
															onClickFavor={onClickFavor}
															onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }}
														/>
													</GridItem>
												}
											})}
										</Grid>
										<Center>
											<Box w="17.5rem" h="3.5rem">
												<PinkButton
													isLoading={false}
													fontSize="1.25rem"
													borderWidth="0.1875rem"
													onClick={async () => { router.push(`/collection?addr=${nftInfo ? nftInfo.nft : ''}`) }}
												>
													{t('view_all_collection')}
												</PinkButton>
											</Box>
										</Center>
									</AccordionPanel>
								</AccordionItem>
							</Accordion>
						</GridItem>
					</SimpleGrid>
				}
			</Box>
			{nftInfo && <Purchase
				onModalClose={onPurchaseClose}
				isModalOpen={isPurchaseOpen}
				nftAddress={nftInfo?.nft}
				tokenId={nftInfo?.tokenId}
				owner={nftInfo?.owner}
				item_img={nftInfo?.mainImage}
				item_name={nftInfo?.name}
				price={priceInfo?.price}
				royalty={nftInfo?.royalty}
				setIsListed={toggleIsListed}
				setIsOwner={toggleIsOwner}
				payToken={nftInfo?.payToken}
			/>}
			{nftInfo && <MakeOffer
				onModalClose={onMakeOfferClose}
				isModalOpen={isMakeOfferOpen}
				nftAddress={nftInfo?.nft}
				tokenId={nftInfo?.tokenId}
				owner={nftInfo?.owner}
				item_img={nftInfo?.mainImage}
				item_name={nftInfo?.name}
				royalty={nftInfo?.royalty}
				setIsOffered={toggleIsOffered}
			/>}
			{nftInfo && <Sell
				onModalClose={onSellClose}
				isModalOpen={isSellOpen}
				royalty={nftInfo?.royalty}
				nftAddress={nftInfo?.nft}
				mediaType={nftInfo?.mediaType}
				tokenId={nftInfo?.tokenId}
				nftType={nftInfo?.nftType}
				// setIsAuctionCreated={toggleIsAuctionCreated}
				setAuctionState={setAuctionState}
				setIsListed={toggleIsListed}
				setPriceInfo={setPriceInfo}
			/>}
			{nftInfo && <EditPrice
				onModalClose={onEditPriceClose}
				isModalOpen={isEditPriceOpen}
				nftAddress={nftInfo?.nft}
				tokenId={nftInfo?.tokenId}
				item_img={nftInfo?.mainImage}
				item_name={nftInfo?.name}
				royalty={nftInfo?.royalty}
				priceInfo={priceInfo}
				setPriceInfo={setPriceInfo}
			/>}
			{nftInfo && <PlaceBid
				onModalClose={onPlaceBidClose}
				isModalOpen={isPlaceBidOpen}
				nftAddress={nftInfo?.nft}
				tokenId={nftInfo?.tokenId}
				owner={nftInfo?.owner}
				item_img={nftInfo?.mainImage}
				item_name={nftInfo?.name}
				royalty={nftInfo?.royalty}
				payToken={nftInfo?.payToken}
				setIsBidded={toggleIsBidded}
			/>}
			{nftInfo && <AcceptOffer
				onModalClose={onAcceptOfferClose}
				isModalOpen={isAcceptOfferOpen}
				nftAddress={nftInfo?.nft}
				tokenId={nftInfo?.tokenId}
				item_img={nftInfo?.mainImage}
				item_name={nftInfo?.name}
				offerSelected={offerSelected as OfferType}
				setIsOffered={toggleIsOffered}
				setIsOwner={toggleIsOwner}
			/>}
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
