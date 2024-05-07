'use client'

import React, { ReactElement, useEffect, useState, useCallback, ChangeEvent } from 'react'
import { CopyIcon, LinkIcon } from '@chakra-ui/icons'
import {
	Box,
	Grid,
	SimpleGrid,
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
	FormControl,
	FormLabel,
	Input,
	Button,
	InputGroup,
	InputRightElement,
	Textarea,
	useToast,
	useClipboard,
	Tooltip,
	CircularProgress,
	useDisclosure
} from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useForm } from 'react-hook-form'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import PopularCard from '@/components/base/Cards/Popular'
import RecommendedCard from '@/components/base/Cards/Recommended'
import VerifyKeyModal from '@/components/base/Modals/VerifyKey'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { BACKEND_HOST } from '@/constants/env'
import { SUBGRAPH_URL } from '@/constants/env'
import { CollectionType, DataType, FavoriteType, FormValues, ListedItemType, SimpleCollectionType, TransferType, UserInfoType } from '@/lib/types'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'
import { fetchUserList, generateIPFSURL } from '@/utils/fetch'
import { validateFiles } from '@/utils/validator'

const Page = () => {
	const toast = useToast();
	const { t } = useTranslation('common');
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [tabLoading, setTabLoading] = useState(false);
	const [hover, setHover] = useState(false);
	const { onCopy, /*value,*/ setValue: setClipboardValue, hasCopied } = useClipboard('');
	const [postsPerPage] = useState(10);
	const { address/*, connector*/, isConnected } = useAccount();
	const cAddress = address ? checksumAddress(address as Address) : '0x0';
	let userList: Array<UserInfoType> = [];
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [bannerImage, setBannerImage] = useState('');
	const [avatarImage, setAvatarImage] = useState('');
	const [verified, setVerified] = useState(false);
	const { isOpen: isVerificationOpen, onOpen: onVerificationOpen, onClose: onVerificationClose } = useDisclosure();

	const handleEmailClick = async () => {
		try {
			const resEmailAuth = await fetch(`${BACKEND_HOST}api/auth/email`, {
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				method: "POST",
				body: JSON.stringify({
					address: cAddress
				})
			});
			// const json_res = await resEmailAuth.json();

			if (resEmailAuth.status === 200) {
				onVerificationOpen();
			}
		} catch (error) {
			showError(error, toast, t);
			console.log(error);
		}
	};
	// to be implemented in next phase
	// const handleTwitterClick = () => { };
	// const handlePurchaseClick = () => { };
	// const [verify, setVerify] = React.useState(false);
	// const handleVerifyClick = () => setVerify(!verify);
	const { register, setValue, handleSubmit, formState: { errors, isSubmitting }, } = useForm<FormValues>();

	const [saleCurrentPage, setSaleCurrentPage] = useState(0);
	const [ownedCurrentPage, setOwnedCurrentPage] = useState(0);
	const [createdCurrentPage, setCreatedCurrentPage] = useState(0);
	const [favoriteCurrentPage, setFavoriteCurrentPage] = useState(0);
	const [saleItems, setSaleItems] = useState(Array<ListedItemType>);
	const [ownedItems, setOwnedItems] = useState(Array<TransferType>);
	const [createdItems, setCreatedItems] = useState(Array<SimpleCollectionType>);
	const [favoriteItems, setFavoriteItems] = useState(Array<FavoriteType>);
	const [saleData, setSaleData] = useState(Array<DataType>);
	const [ownedData, setOwnedData] = useState(Array<DataType>);
	const [createdData, setCreatedData] = useState(Array<CollectionType>);
	const [favoriteData, setFavoriteData] = useState(Array<DataType>);

	const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target?.files?.[0];

		if (file) {
			const validation = validateFiles(file);
			if (validation === true) {
				const formData = new FormData();
				formData.set("profileImage", file);
				formData.set("address", cAddress);

				const uploadResult = await fetch(`${BACKEND_HOST}api/uploadProfileImage`, {
					method: "POST",
					body: formData,
				});
				if (uploadResult.status != 200) {
					setLoading(false);
					toast({
						title: t('file_upload_failed'),
						status: 'error',
						isClosable: true,
					});
				}

				const resultJSON = await uploadResult.json();
				const ipfsPath = resultJSON.ipfsPath;

				setAvatarImage(generateIPFSURL(ipfsPath, 300, 300, 'cover'));
				e.target.files = null;

				toast({
					title: t('change_image_success'),
					status: 'success',
					isClosable: true,
				});
			} else {
				toast({
					title: validation,
					status: 'warning',
					isClosable: true,
				});
			}
		};
	}

	async function fetchSaleItems() {
		try {
			const listingsQuery = `
				query ListingsQuery {
					itemListeds(orderBy: blockTimestamp, orderDirection: desc, where: {owner: "${cAddress}"}) {
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
				return {
					...elem,
					payToken: checksumAddress(elem.payToken || '0x0'),
					pricePerItem: calculatePrice(elem.pricePerItem, checksumAddress(elem.payToken || '0x0'))
				}
			});;
			setSaleItems(listingEntities);
		} catch (error) {
			console.log(error);
		}
	}

	async function fetchOwnedItems() {
		try {
			const transfersQuery = `
				query TransfersQuery {
					transfers(orderBy: blockTimestamp, orderDirection: desc) {
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

			setOwnedItems(transfers.filter(elem => elem.to === cAddress));
		} catch (error) {
			console.log(error);
		}
	}

	async function fetchCreatedItems() {
		try {
			const listingsQuery = `
				query ListingsQuery {
					contractCreateds(orderBy: blockTimestamp, orderDirection: desc, where: {creator: "${cAddress}"}) {
						nft
						creator
						nftType
					}
				}
			`;

			const urqlClient = createClient({
				url: SUBGRAPH_URL,
				exchanges: [fetchExchange]
			});

			const response = await urqlClient.query(listingsQuery, {}).toPromise();
			const listingEntities: SimpleCollectionType[] = response.data.contractCreateds;
			setCreatedItems(listingEntities);
		} catch (error) {
			console.log(error);
		}
	}

	async function fetchFavoriteItems() {
		try {
			const res_favorite = await fetch(`${BACKEND_HOST}api/favorite/${cAddress}`, {
				method: "GET",
			});
			const json_favorite = await res_favorite.json();
			setFavoriteItems(json_favorite);
		} catch (error) {
			console.log(error);
		}
	}

	useEffect(() => {
		(async () => {
			try {
				setTabLoading(true);
				if (saleItems.length > 0) {
					const tempGalleryData: Array<DataType> = [];
					for (let i = ((saleCurrentPage - 1) * postsPerPage); i < ((saleCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
						if (i >= saleItems.length) break;
						const tokenUri = await readContract({
							address: saleItems[i].nft,
							abi: erc721Json.abi,
							functionName: 'tokenURI',
							args: [saleItems[i].tokenId]
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
							address: saleItems[i].nft,
							abi: erc721Json.abi,
							functionName: 'owner',
						});

						const favorData = favoriteItems.filter((obj) => {
							return (obj.TokenId == saleItems[i].tokenId) && (obj.Collection == saleItems[i].nft);
						});

						const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
						const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(saleItems[i]?.owner || '0x0'));

						tempGalleryData.push({
							nft: saleItems[i].nft,
							nftType: 'ERC721',
							tokenId: saleItems[i].tokenId,
							name: resultMeta.name,
							nft_desc: resultMeta.description,
							mainImage: mainImage,
							mediaType: resultMeta.mediaType,
							royalty: resultMeta.royalty,
							creator: creator ? checksumAddress(creator as Address) : '0x0',
							creatorImage: creatorInfo?.AvatarImage || '',
							owner: saleItems[i]?.owner ? checksumAddress(saleItems[i].owner) : '0x0',
							ownerImage: ownerInfo?.AvatarImage || '',
							price: calculatePrice(saleItems[i].pricePerItem, saleItems[i].payToken || '0x0'),
							payToken: saleItems[i].payToken,
							amount: saleItems[i].quantity,
							startingTime: saleItems[i].startingTime,
							endTime: 0,
							creatorName: creatorInfo?.UserName || '',
							ownerName: ownerInfo?.UserName || '',
							isFavor: favorData?.length > 0 ? true : false,
						});
					}
					setSaleData(tempGalleryData);
				}
				setTabLoading(false);
			} catch (error) {
				showError(error, toast, t);
				console.log(error);
			}
		})();
	}, [saleCurrentPage]);

	useEffect(() => {
		(async () => {
			try {
				setTabLoading(true);
				if (ownedItems.length > 0) {
					const tempGalleryData: Array<DataType> = [];
					for (let i = ((ownedCurrentPage - 1) * postsPerPage); i < ((ownedCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
						if (i >= ownedItems.length) break;
						const tokenUri = await readContract({
							address: ownedItems[i].nft,
							abi: erc721Json.abi,
							functionName: 'tokenURI',
							args: [ownedItems[i].tokenId]
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
							address: ownedItems[i].nft,
							abi: erc721Json.abi,
							functionName: 'owner',
						});

						const listedData = saleItems.filter((obj) => {
							return (obj.tokenId === ownedItems[i].tokenId) && (obj.nft === ownedItems[i].nft);
						});

						const favorData = favoriteItems.filter((obj) => {
							return (obj.TokenId == ownedItems[i].tokenId) && (obj.Collection == ownedItems[i].nft);
						});

						const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
						const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(ownedItems[i]?.to || '0x0'));

						tempGalleryData.push({
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
						});
					}
					setOwnedData(tempGalleryData);
				}
				setTabLoading(false);
			} catch (error) {
				showError(error, toast, t);
				console.log(error);
			}
		})();
	}, [ownedCurrentPage]);

	useEffect(() => {
		(async () => {
			try {
				setTabLoading(true);
				if (createdItems.length > 0) {
					const tempCollections: Array<CollectionType> = [];
					for (let i = ((createdCurrentPage - 1) * postsPerPage); i < ((createdCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
						if (i >= createdItems.length) break;
						const metadataUrl = await readContract({
							address: createdItems[i].nft,
							abi: createdItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
							functionName: 'metadataUrl',
						});

						const totalSupply = await readContract({
							address: createdItems[i].nft,
							abi: createdItems[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
							functionName: 'totalSupply',
							args: createdItems[i].nftType === 'ERC721' ? [] : [0]
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

						const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(createdItems[i]?.creator as Address || '0x0'));

						tempCollections.push({
							name: resultMeta.name,
							symbol: resultMeta.symbol,
							description: resultMeta.description,
							banner: bannerImg,
							icon: iconImg,
							amount: totalSupply === 0 ? '0' : (totalSupply as string).toString(),
							nftType: createdItems[i].nftType,
							nft: createdItems[i].nft,
							creator: creatorInfo ? creatorInfo.UserName ? creatorInfo.UserName : 'No name' : createdItems[i]?.creator ? `${checksumAddress(createdItems[i].creator as `0x${string}`).slice(0, 6)}...${checksumAddress(createdItems[i].creator as `0x${string}`).slice(-4)}` : '0x0',
							intro: creatorInfo ? creatorInfo.Introduction : 'Unregisterd user'
						});
					}
					setCreatedData(tempCollections);
				}
				setTabLoading(false);
			} catch (error) {
				showError(error, toast, t);
				console.log(error);
			}
		})();
	}, [createdCurrentPage]);

	useEffect(() => {
		(async () => {
			try {
				if (favoriteItems.length > 0) {
					setTabLoading(true);
					const tempGalleryData: Array<DataType> = [];
					for (let i = ((favoriteCurrentPage - 1) * postsPerPage); i < ((favoriteCurrentPage - 1) * postsPerPage + postsPerPage); i++) {
						if (i >= favoriteItems.length) break;
						const tokenUri = await readContract({
							address: favoriteItems[i].Collection,
							abi: erc721Json.abi,
							functionName: 'tokenURI',
							args: [favoriteItems[i].TokenId]
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
							address: favoriteItems[i].Collection,
							abi: erc721Json.abi,
							functionName: 'owner',
						});

						const owner = await readContract({
							address: favoriteItems[i].Collection,
							abi: erc721Json.abi,
							functionName: 'ownerOf',
							args: [favoriteItems[i].TokenId]
						});

						const listedData = saleItems.filter((obj) => {
							return (obj.tokenId === favoriteItems[i].TokenId) && (obj.nft === favoriteItems[i].Collection);
						});

						const creatorInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(creator as Address || '0x0'));
						const ownerInfo = userList.find(elem => checksumAddress(elem.Address || '0x0') === checksumAddress(owner as Address || '0x0'));

						tempGalleryData.push({
							nft: favoriteItems[i].Collection,
							nftType: 'ERC721',
							tokenId: favoriteItems[i].TokenId,
							name: resultMeta.name,
							nft_desc: resultMeta.description,
							mainImage: mainImage,
							mediaType: resultMeta.mediaType,
							royalty: resultMeta.royalty,
							creator: creator ? checksumAddress(creator as Address) : '0x0',
							creatorImage: creatorInfo?.AvatarImage || '',
							owner: owner ? checksumAddress(owner as Address) : '0x0',
							ownerImage: ownerInfo?.AvatarImage || '',
							price: listedData.length !== 0 ? calculatePrice(listedData[0].pricePerItem, listedData[0].payToken || '0x0') : 0,
							payToken: listedData.length !== 0 ? listedData[0].payToken : '' as Address,
							amount: listedData.length !== 0 ? listedData[0].quantity : 1,
							startingTime: listedData.length !== 0 ? listedData[0].startingTime : 0,
							endTime: 0,
							creatorName: creatorInfo?.UserName || '',
							ownerName: ownerInfo?.UserName || '',
							isFavor: true,
						});
					}
					setFavoriteData(tempGalleryData);
					setTabLoading(false);
				}
			} catch (error) {
				showError(error, toast, t);
				console.log(error);
			}
		})();
	}, [favoriteCurrentPage]);

	const onClickSaleFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
		setSaleData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}))
	}, []);

	const onClickOwnedFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
		setOwnedData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}))
	}, []);

	const onClickFavor = useCallback((nft: Address, tokenId: number, isFavor: boolean) => {
		setFavoriteData(state => state.map((_dealInfo) => {
			if (_dealInfo.nft === nft && _dealInfo.tokenId === tokenId) {
				return { ..._dealInfo, isFavor };
			}
			return _dealInfo;
		}))
	}, []);

	const initAllCurrentPage = async (_index: number) => {
		switch (_index) {
			case 0:
				await fetchSaleItems();
				setSaleCurrentPage(1);
				break;
			case 1:
				await fetchOwnedItems();
				setOwnedCurrentPage(1);
				break;
			case 2:
				await fetchCreatedItems();
				setCreatedCurrentPage(1);
				break;
			case 3:
				await fetchFavoriteItems();
				setFavoriteCurrentPage(1);
				break;
			default:
				break;
		}
	}

	useEffect(() => {
		isConnected && (async () => {
			try {
				setClipboardValue(cAddress as Address);
				userList = await fetchUserList();
				const response = await fetch(`${BACKEND_HOST}api/user/${cAddress}`, {
					method: "GET",
				});
				if (response.status === 200) {
					const resJson = await response.json();
					setValue("username", resJson.UserName);
					setValue("email", resJson.Email);
					setEmail(resJson.Email);
					setVerified(resJson.EmailVerified);
					setValue("purchase_id", resJson.PurchaseID);
					setValue("introduction", resJson.Introduction);
					setValue("website", resJson.Website);
					setValue("discord", resJson.Discord);
					setValue("x", resJson.X);
					setValue("youtube", resJson.Youtube);
					setValue("instagram", resJson.Instagram);
					setValue("bannerimage", resJson.BannerImage);
					setValue("avatarimage", resJson.AvatarImage);
					setUsername(resJson.UserName);
					setBannerImage(resJson.BannerImage);
					setAvatarImage(generateIPFSURL(resJson.AvatarImage || '0x0', 120, 120, 'cover'));
				}
				setLoading(false);
			} catch (error) {
				showError(error, toast, t);
				console.log(error);
			}
		})();
	}, []);

	const onSubmit = handleSubmit(async (data: FormValues) => {
		if (!isConnected) {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		} else {
			try {
				const formData = new FormData();
				formData.set("address", cAddress as Address);
				formData.set("username", data.username);
				formData.set("email", data.email);
				formData.set("verify", data.verify);
				formData.set("purchase_id", data.purchase_id);
				formData.set("introduction", data.introduction);
				formData.set("website", data.website);
				formData.set("discord", data.discord);
				formData.set("x", data.x);
				formData.set("youtube", data.youtube);
				formData.set("instagram", data.instagram);
				formData.set("bannerimg", data.bannerimage);
				formData.set("avatarimg", data.avatarimage);
				formData.set("email_verified", (verified && data.email === email).toString());

				const response = await fetch(`${BACKEND_HOST}api/user`, {
					method: "PUT",
					body: formData,
				});
				if (response.status === 200) {
					setEmail(data.email);
					setVerified(verified && data.email === email);
					toast({
						title: t('profile_save_success'),
						status: 'success',
						isClosable: true,
					});
				}
			} catch (error) {
				toast({
					title: t('profile_save_failed'),
					status: 'error',
					isClosable: true,
				});
				showError(error, toast, t);
				console.log(error);
			}
		}
	});

	return (
		<>
			<Head>
				<title>Profile</title>
				<meta name="description" content="NFT Marketplace" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Box>
				{loading ?
					<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
						<CircularProgress color="text.pink" isIndeterminate />
					</Center>
					:
					<>
						<Image src={bannerImage} height="17.5rem" bg="text.dark" />
						<Box position="relative" mx={{ base: '0.75rem', lg: '2.5rem' }} mb="3.5rem">
							<VStack
								position="absolute"
								w="13rem"
								top="-14.0625rem"
								borderRadius="xl"
								boxShadow="2px 2px 10px 0px #00000040"
								bg="white"
								gap={3}
								padding="2.5625rem 1.875rem"
							>
								<Box boxSize="7.265rem" position="relative" borderRadius="50%" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
									<Avatar src={avatarImage} boxSize="100%" bg="text.green" />
									<Box
										as="button"
										position="absolute"
										width="100%"
										height="100%"
										backgroundColor="#00000040"
										borderRadius="50%"
										left="0"
										top="0"
										hidden={!hover}
									>
										<LinkIcon font-size="1.5rem" />
										<Input
											type="file"
											height="100%"
											width="100%"
											position="absolute"
											top="0"
											left="0"
											opacity="0"
											aria-hidden="true"
											accept="image/*|png"
											onChange={handleFileChange}
										/>
									</Box>
								</Box>
								<Center fontWeight={600} fontSize="1.5rem" lineHeight={1} color="text.black">{username}</Center>
								<Center w="100%" gap={1}>
									<Text fontWeight={400} fontSize="1rem" lineHeight={1} color="text.gray" noOfLines={1}>{`${cAddress?.slice(0, 6)}...${cAddress?.slice(-4)}`}</Text>
									<Tooltip label={hasCopied ? t('copied') : t('copy')} aria-label='A tooltip'>
										<CopyIcon color="text.green" onClick={onCopy} _hover={{ cursor: 'pointer' }} />
									</Tooltip>
								</Center>
							</VStack>
						</Box>
						<Box mx={{ base: '1rem', lg: '3.25rem' }}>
							<Tabs defaultIndex={4} onChange={(index) => { initAllCurrentPage(index) }}>
								<TabList borderWidth={0} pb="2px" gap={{ base: 0, lg: '1.75rem' }} overflowX={{ base: 'scroll', md: 'hidden' }} overflowY="hidden" mb={{ base: 4, lg: 7.5 }}>
									<Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py={4} px={{ base: '0.7rem', sm: '1rem' }}>{t('onsale')}</Tab>
									<Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py={4} px={{ base: '0.7rem', sm: '1rem' }}>{t('owned')}</Tab>
									<Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py={4} px={{ base: '0.7rem', sm: '1rem' }}>{t('created')}</Tab>
									<Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py={4} px={{ base: '0.7rem', sm: '1rem' }}>{t('favorite')}</Tab>
									<Tab _selected={{ color: 'text.tab', borderBottomWidth: '2px', borderBottomColor: 'text.tab' }} fontWeight={600} py={4} px={{ base: '0.7rem', sm: '1rem' }}>{t('my_profile')}</Tab>
								</TabList>
								<TabPanels px="1.5rem" pt="1.125rem" pb={{ base: '2rem', lg: '8.875rem' }}>
									<TabPanel p={0}>
										{tabLoading ?
											<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
												<CircularProgress color="text.pink" isIndeterminate />
											</Center>
											:
											<>
												{(saleItems.length > 0) ?
													<>
														<Grid
															templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
															gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
														>
															{saleData.map((elem, index) => {
																return <GridItem key={index}>
																	<PopularCard {...elem} onClickFavor={onClickSaleFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
																</GridItem>
															})}
														</Grid>
														<Box mb={{ base: '2rem', lg: '6.375rem' }}>
															<Pagination
																totalPosts={saleItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setSaleCurrentPage}
																currentPage={saleCurrentPage} />
														</Box>
													</>
													:
													<Box>{t('no_data')}</Box>
												}

											</>
										}
									</TabPanel>
									<TabPanel p={0}>
										{tabLoading ?
											<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
												<CircularProgress color="text.pink" isIndeterminate />
											</Center>
											:
											<>
												{(ownedItems.length > 0) ?
													<>
														<Grid
															templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
															gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
														>
															{ownedData.map((elem, index) => {
																return <GridItem key={index}>
																	<PopularCard {...elem} onClickFavor={onClickOwnedFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
																</GridItem>
															})}
														</Grid>
														<Box mb={{ base: '2rem', lg: '6.375rem' }}>
															<Pagination
																totalPosts={ownedItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setOwnedCurrentPage}
																currentPage={ownedCurrentPage}
															/>
														</Box>
													</>
													:
													<Box>{t('no_data')}</Box>
												}
											</>
										}
									</TabPanel>
									<TabPanel p={0}>
										{tabLoading ?
											<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
												<CircularProgress color="text.pink" isIndeterminate />
											</Center>
											:
											<>
												{(createdItems.length > 0) ?
													<>
														<Grid
															templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
															gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
														>
															{createdData.map((elem, index) => {
																return <GridItem key={index}>
																	<RecommendedCard {...elem} onClick={() => { router.push(`/collection?addr=${elem.nft}`) }} />
																</GridItem>
															})}
														</Grid>
														<Box mb={{ base: '2rem', lg: '6.375rem' }}>
															<Pagination
																totalPosts={createdItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setCreatedCurrentPage}
																currentPage={createdCurrentPage}
															/>
														</Box>
													</>
													:
													<Box>{t('no_data')}</Box>
												}
											</>
										}
									</TabPanel>
									<TabPanel p={0}>
										{tabLoading ?
											<Center position="absolute" top="0" left="0" width="100%" height="100%"/*backgroundColor="bg.overlay"*/ >
												<CircularProgress color="text.pink" isIndeterminate />
											</Center>
											:
											<>
												{(favoriteItems) ?
													<>
														<Grid
															templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
															gap={{ base: 4, md: 10 }} pb={{ base: 4, md: 10 }}
														>
															{favoriteData.map((elem, index) => {
																return <GridItem key={index}>
																	<PopularCard {...elem} onClickFavor={onClickFavor} onClick={() => { router.push(`/nft?addr=${elem.nft}&tokenId=${elem.tokenId}`) }} />
																</GridItem>
															})}
														</Grid>
														<Box mb={{ base: '2rem', lg: '6.375rem' }}>
															<Pagination
																totalPosts={favoriteItems.length}
																postsPerPage={postsPerPage}
																setCurrentPage={setFavoriteCurrentPage}
																currentPage={favoriteCurrentPage}
															/>
														</Box>
													</>
													:
													<Box>{t('no_data')}</Box>
												}
											</>
										}
									</TabPanel>
									<TabPanel mx={0} p={0}>
										<form onSubmit={onSubmit}>
											<Text mb="1.875rem" fontWeight={700} fontSize="2.5rem" lineHeight={1.2} color="black">{t('profile_setting')}</Text>
											<Flex mb="2.5rem" py="0.625rem" borderBottom="1px" borderColor="black" fontWeight={700} fontSize="1.125rem" lineHeight={1}>{t('site_info')}</Flex>
											<SimpleGrid
												mb="3.75rem"
												columns={3}
												spacing={{ base: '1.5rem', xl: '1.875rem 1.5625rem' }}
											>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('username')}</FormLabel>
														<Input
															id="username"
															size="lg"
															noOfLines={1}
															placeholder={t('please_enter_your_username')}
															width="100%"
															height="3rem"
															borderRadius="base"
															borderColor="text.dark"
															borderWidth="1px"
															{...register('username', {})}
														/>
													</FormControl>
												</GridItem>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('email_address')}</FormLabel>
														<InputGroup size="lg">
															<Input
																id="email"
																type="email"
																noOfLines={1}
																pr={email?.length > 0 ? '9rem' : '1rem'}
																placeholder={t('please_enter_your_email_address')}
																width="100%"
																height="3rem"
																borderRadius="base"
																borderColor="text.dark"
																borderWidth="1px"
																{...register('email', {})}
															/>
															{
																email?.length > 0 ?
																	<InputRightElement width="9rem">
																		<Button width="90%" height="2.25rem" bg="text.green" color="white" borderRadius="1.25rem" fontSize="1rem" onClick={handleEmailClick} isDisabled={verified} >
																			{verified ? t('verified') : t('authentication')}
																		</Button>
																	</InputRightElement>
																	: <></>
															}
														</InputGroup>
													</FormControl>
												</GridItem>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													{/* To be implemented in next stage */}
													{/* <FormControl>
														<FormLabel noOfLines={1} mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('2step_verification_setting')}</FormLabel>
														<InputGroup size="lg">
															<Input
																id="verify"
																noOfLines={1}
																pr="9rem"
																color="text.black"
																value={verify ? t('enable_2step_verification') : t('disable_2step_verification')}
																width="100%"
																height="3rem"
																borderRadius="base"
																borderColor="text.dark"
																borderWidth="1px"
																{...register('verify', {})}
															/>
															<InputRightElement width="9rem">
																<Button width="90%" height="2.25rem" bg="text.green" color="white" borderRadius="1.25rem" fontSize="1rem" onClick={handleVerifyClick}>
																	{verify ? t('disable') : t('enable')}
																</Button>
															</InputRightElement>
														</InputGroup>
													</FormControl> */}
												</GridItem>
												{/* To be implemented in next stage */}
												{/* <GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl mb="2.5rem">
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('purchase_id')}</FormLabel>
														<InputGroup size="lg">
															<Input
																id="purchase"
																isDisabled={true}
																noOfLines={1}
																pr="6.75rem"
																placeholder={t('please_enter_your_purchase_id')}
																width="100%"
																height="3rem"
																borderRadius="base"
																borderColor="text.dark"
																borderWidth="1px"
																{...register('purchase_id', {})}
															/>
															<InputRightElement width='6.75rem'>
																<Button isDisabled={true} width="90%" height="2.25rem" bg="text.green" color="white" borderRadius="1.25rem" fontSize="1rem" onClick={handlePurchaseClick} >
																	{t('send')}
																</Button>
															</InputRightElement>
														</InputGroup>
													</FormControl>
													<Button
														isDisabled={true}
														w="100%"
														h="3.5rem"
														bg="text.green"
														color="white"
														fontSize="1rem"
														fontWeight={700}
														lineHeight={1}
													>
														{t('apply_for_a_certification_batch')}
													</Button>
												</GridItem> */}
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 2 }}>
													<FormControl isInvalid={!!errors?.introduction?.message} height="100%">
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('profile')}</FormLabel>
														<Textarea
															id="introduction"
															size="lg"
															placeholder={t('please_enter_your_self_introduction')}
															width="100%"
															height="100%"
															padding="1.25rem 1rem"
															borderRadius="base"
															borderColor="text.dark"
															borderWidth="1px"
															{...register('introduction', {
																maxLength: { value: 200, message: 'Maximum length should be 200' }
															})}
														/>
													</FormControl>
												</GridItem>
											</SimpleGrid>
											<Flex mb="2.5rem" py="0.625rem" borderBottom="1px" borderColor="black" fontWeight={700} fontSize="1.125rem" lineHeight={1}>{t('sns_info')}</Flex>
											<SimpleGrid
												columns={3}
												spacing={{ base: '1.5rem', xl: '1.875rem 1.5625rem' }}
											>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('website')}</FormLabel>
														<Input
															id="website"
															size="lg"
															noOfLines={1}
															placeholder={t('please_enter_your_website_url')}
															width="100%"
															height="3rem"
															borderRadius="base"
															borderColor="text.dark"
															borderWidth="1px"
															{...register('website', {})}
														/>
													</FormControl>
												</GridItem>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('discord')}</FormLabel>
														<Input
															id="discord"
															size="lg"
															noOfLines={1}
															placeholder={t('please_enter_your_the_url_of_the_discord_channel')}
															width="100%"
															height="3rem"
															borderRadius="base"
															borderColor="text.dark"
															borderWidth="1px"
															{...register('discord', {})}
														/>
													</FormControl>
												</GridItem>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>X</FormLabel>
														<InputGroup size="lg">
															<Input
																id="x"
																noOfLines={1}
																pr="9rem"
																placeholder={t('please_enter_a_username_that_omits@')}
																width="100%"
																height="3rem"
																borderRadius="base"
																borderColor="text.dark"
																borderWidth="1px"
																{...register('x', {})}
															/>
															{/* To be implemented in next stage */}
															{/* <InputRightElement width='9rem'>
																<Button width="90%" bg="text.green" color="white" borderRadius="1.25rem" fontSize="1rem" onClick={handleTwitterClick} >
																	{t('authentication')}
																</Button>
															</InputRightElement> */}
														</InputGroup>
													</FormControl>
												</GridItem>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>YouTube</FormLabel>
														<Input
															id="youtube"
															size="lg"
															noOfLines={1}
															placeholder={t('please_enter_your_youtube_channel_URL')}
															width="100%"
															height="3rem"
															borderRadius="base"
															borderColor="text.dark"
															borderWidth="1px"
															{...register('youtube', {})}
														/>
													</FormControl>
												</GridItem>
												<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }}>
													<FormControl>
														<FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={700}>{t('instagram')}</FormLabel>
														<Input
															id="instagram"
															size="lg"
															noOfLines={1}
															placeholder={t('please_enter_your_instagram_username')}
															width="100%"
															height="3rem"
															borderRadius="base"
															borderColor="text.dark"
															borderWidth="1px"
															{...register('instagram', {})}
														/>
													</FormControl>
												</GridItem>
											</SimpleGrid>
											<Center px={{ base: '1rem', md: '2.5rem' }} mt={{ base: '2.25rem', lg: '5.25rem', xl: '7.5rem' }}>
												<Grid
													templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
													gap="1.25rem"
													h={{ base: '8.25rem', lg: '3.5rem' }}
													w={{ base: '100%', lg: '36.25rem' }}
												>
													<PinkButton
														isLoading={isSubmitting}
														fontSize="1.25rem"
														borderWidth="0.1875rem"
														type="submit"
													>
														{t('save_settings')}
													</PinkButton>
													<PinkButton
														isLoading={false}
														fontSize="1.25rem"
														borderWidth="0.1875rem"
														onClick={() => { }}
													>
														{t('cancel')}
													</PinkButton>
												</Grid>
											</Center>
										</form>
									</TabPanel>
								</TabPanels>
							</Tabs>
							<VerifyKeyModal onModalClose={onVerificationClose} isModalOpen={isVerificationOpen} setVerified={() => setVerified(true)} />
						</Box>
					</>
				}
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
