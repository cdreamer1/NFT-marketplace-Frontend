'use client'

import React, { ReactElement, useEffect, useState, useCallback } from 'react'
import {
	Box,
	Grid,
	GridItem,
	Image,
	Text,
	Avatar,
	VStack,
	Flex,
	Center,
	useToast,
	CircularProgress,
	SimpleGrid,
	NumberInput,
	NumberInputField,
} from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { readContract, writeContract, waitForTransaction } from '@wagmi/core'
import { parseEther } from 'ethers'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import erc721Json from '@/abis/LaunchpadERC721.json'
import launchpadSaleJson from '@/abis/LaunchpadSale.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import MainLayout from '@/components/layouts/MainLayout'
import {
	launchpadProxyContract,
	proxyAdminContract,
} from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { staticPath } from '@/lib/$path'
import { LaunchpadType } from '@/lib/types'

// Used for static path generation
// async function fetchLaunchpads() {
// 	try {
// 		const launchpadList = await fetch(`${server}api/launchpad`, {
// 			method: "GET",
// 		});
// 		const launchpadJson: LaunchpadInfo[] = await launchpadList.json();

// 		const paths: { params: { address: `0x${string}` }; locale: string }[] = [];
// 		launchpadJson.forEach(entity => {
// 			paths.push({ params: { address: entity.ContractAddress }, locale: "en" });
// 			paths.push({ params: { address: entity.ContractAddress }, locale: "ja" });
// 			paths.push({ params: { address: entity.ContractAddress }, locale: "cn" });
// 		});

// 		return paths;
// 	} catch (error) {
// 		console.log(error);
// 		return [];
// 	}
// }

const Page = (/*props: { address: `0x${string}` }*/) => {
	const { t } = useTranslation('common');
	const toast = useToast();
	const router = useRouter();
	const collectionAddress = router.query.addr;
	const { address, isConnected } = useAccount();
	const cAddress = address ? checksumAddress(address as Address) : '0x0';
	const [loading, setLoading] = useState(true);
	const [launchpadInfo, setLaunchpadInfo] = useState<LaunchpadType>({} as LaunchpadType)
	const [isBuying, setIsBuying] = useState(false);
	const [buys, setBuys] = useState(0);
	const handleChange = (value: string) => setBuys(Number(value));

	function getRemainingTime(endTimestamp: number, currentTimestamp: number): string {
		const diffInMilliseconds = endTimestamp - currentTimestamp / 1000;
		const diffInSeconds = Math.floor(diffInMilliseconds / 1);

		const hours = Math.floor(diffInSeconds / 3600);
		const minutes = Math.floor((diffInSeconds % 3600) / 60);
		const seconds = diffInSeconds % 60;

		return `${hours}:${minutes}:${seconds}`;
	}

	async function fetchLaunchpadInfo() {
		const result = await fetch(`${BACKEND_HOST}api/launchpad/${collectionAddress}`, {
			method: "GET",
		});
		const { launchpad: padInfo, volumes } = await result.json();

		if (padInfo) {
			setLoading(true);

			const launchpadContractAddress = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [launchpadProxyContract[CHAIN_ID]],
			});

			const price = await readContract({
				address: padInfo?.ContractAddress as Address,
				abi: erc721Json.abi,
				functionName: 'price',
			});

			const sold = await readContract({
				address: launchpadContractAddress as Address,
				abi: launchpadSaleJson.abi,
				functionName: 'soldOut',
			});

			const rem = await readContract({
				address: launchpadContractAddress as Address,
				abi: launchpadSaleJson.abi,
				functionName: 'remaining',
			});

			const max = await readContract({
				address: launchpadContractAddress as Address,
				abi: launchpadSaleJson.abi,
				functionName: 'maxSelling',
			});

			const start = await readContract({
				address: launchpadContractAddress as Address,
				abi: launchpadSaleJson.abi,
				functionName: 'startTime',
			});

			const end = await readContract({
				address: launchpadContractAddress as Address,
				abi: launchpadSaleJson.abi,
				functionName: 'endTime',
			});

			setLaunchpadInfo({
				...padInfo,
				FloorPrice: Number(price) / 10000,
				Solds: Number(sold),
				Remain: Number(rem),
				Total: Number(max),
				StartTime: Number(start),
				EndTime: Number(end),
				VolumeTraded: Number(volumes.Sum) / 10000,
				Owners: Number(volumes.Count)
			});

			setLoading(false);
		}
	}

	const onClickBuy = useCallback(async () => {
		if (isConnected && cAddress) {
			setIsBuying(true);
			const launchpadContractAddress = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [launchpadProxyContract[CHAIN_ID]],
			});

			const totalPrice = Number(buys) * launchpadInfo.FloorPrice;
			const { hash } = await writeContract({
				address: launchpadContractAddress as Address,
				abi: launchpadSaleJson.abi,
				functionName: 'buy',
				args: [buys],
				value: parseEther(totalPrice.toString()),
			});
			await waitForTransaction({ hash });

			const formData = new FormData();
			formData.set("contract_address", launchpadInfo.ContractAddress);
			formData.set("buyer", cAddress.toString());
			formData.set("volume", (totalPrice * 10000).toString());
			const res_sum = await fetch(`${BACKEND_HOST}api/launchpad/sold`, {
				method: "POST",
				body: formData
			});
			const { Sum, Count } = await res_sum.json();
			setLaunchpadInfo({
				...launchpadInfo,
				VolumeTraded: Number(Sum) / 10000,
				Owners: Number(Count),
				Remain: launchpadInfo.Remain - Number(buys)
			});

			setIsBuying(false);
		} else {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		}
	}, [buys, isConnected]);

	useEffect(() => {
		(async () => {
			await fetchLaunchpadInfo();
			setLoading(false);
		})();
	}, []);

	return (
		<>
			<Head>
				<title>{launchpadInfo?.Name}</title>
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
							<Image src={launchpadInfo?.BannerImage} width="100%" height="17.5rem" bg="bg.card" />
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
									<VStack flexGrow={1} px={3} py={1.5}>
										<Avatar src={launchpadInfo?.IconImage} boxSize="11.25rem" bg="text.dark" />
										<Center fontWeight={600} fontSize="2.25rem" lineHeight={1} color="text.black" mt="1.625rem" noOfLines={1}>{launchpadInfo?.Name}</Center>
									</VStack>
									<VStack gap={3.5} align="flex-end" w={{ base: '100%', lg: '53%' }}>
										<Grid
											templateColumns="repeat(4, 1fr)"
											gap={11}
											w="100%"
											textAlign="center"
										>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Text height="50%" fontSize="1.25rem" fontWeight="600" mb="0.5rem" lineHeight={1}>{launchpadInfo?.Amount}</Text>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>NFTs</Text>
											</Box>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Text height="50%" fontSize="1.25rem" fontWeight="600" mb="0.5rem" lineHeight={1}>{launchpadInfo?.Owners}</Text>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>{t('owners')}</Text>
											</Box>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Text height="50%" fontSize="1.25rem" fontWeight="600" mb="0.5rem" lineHeight={1}>{launchpadInfo?.FloorPrice}</Text>
												<Text height="50%" fontSize="0.75rem" fontWeight="400" lineHeight={1}>{t('floor_price')}</Text>
											</Box>
											<Box borderRadius="xl" borderWidth="1px" borderColor="text.dark" py="1.125rem">
												<Center height="50%" width="100%" gap="0.4375rem" mb="0.5rem">
													<Image src={staticPath.polygon_icon_svg} borderRadius="full" width="1.25rem" height="1.25rem" bg="bg.card" />
													<Text fontSize="1.25rem" fontWeight="600" lineHeight={1}>{launchpadInfo?.VolumeTraded}</Text>
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
													<Text fontWeight={600} fontSize="1.25rem" color="text.black" noOfLines={1}>{launchpadInfo?.Seller}</Text>
													<Text mt={2} fontWeight={400} fontSize="0.75rem" lineHeight={1} color="text.dark" textAlign="justify" noOfLines={1}>{launchpadInfo?.Intro}</Text>
												</Box>
												<Box>
													<Text fontWeight={600} fontSize="1.25rem" color="text.black" noOfLines={1}>{launchpadInfo?.Name}</Text>
													<Text mt={2} fontWeight={400} fontSize="0.75rem" lineHeight={1} color="text.dark" textAlign="justify" noOfLines={1}>{launchpadInfo?.Description}</Text>
												</Box>
											</Grid>
										</Flex>
									</VStack>
								</Flex>
							</Box>
							<SimpleGrid
								columns={3}
								spacing={{ base: '1.5rem', xl: '2.5rem 3.375rem' }}
							>
								<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }} mb={{ base: '0rem', lg: '1.625rem' }}>
									<VStack>
										<CircularProgress size="120px" value={(Date.now() / 1000 - Number(launchpadInfo?.StartTime)) * 100 / (Number(launchpadInfo?.EndTime) - Number(launchpadInfo?.StartTime))} />
										<Text mb="0.7rem" fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
											Time remain: {getRemainingTime(Number(launchpadInfo?.EndTime), Date.now())}
										</Text>
									</VStack>
								</GridItem>
								<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }} mb={{ base: '0rem', lg: '1.625rem' }}>
									<VStack>
										<Box padding={0} color="text.black" mb="2rem" w="20rem">
											<Text mb="0.7rem" fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
												{t('purchase_amount')}:
											</Text>
											<NumberInput min={0} max={Number(launchpadInfo?.Remain)} value={buys} onChange={handleChange} clampValueOnBlur={true}>
												<NumberInputField />
											</NumberInput>
										</Box>
										<Box mb={{ base: '2.25rem', lg: '4rem', xl: '5rem' }} h="3rem" w="20rem">
											<PinkButton
												disabled={!isConnected}
												isLoading={isBuying}
												fontSize="1.25rem"
												borderWidth="0.1875rem"
												onClick={onClickBuy}
											>
												{t('buy')}
											</PinkButton>
										</Box>
									</VStack>
								</GridItem>
								<GridItem rowSpan={1} colSpan={{ base: 3, lg: 1 }} mb={{ base: '0rem', lg: '1.625rem' }}>
									<VStack>
										<CircularProgress size="120px" value={Number(launchpadInfo?.Solds) * 100 / Number(launchpadInfo?.Total)} />
										<Text mb="0.7rem" fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
											Token remain: {Number(launchpadInfo?.Remain)}
										</Text>
									</VStack>
								</GridItem>
							</SimpleGrid>
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
// 	const paths = await fetchLaunchpads();
// 	return {
// 		paths,
// 		fallback: 'blocking',
// 	}
// }

Page.getLayout = function getLayout(page: ReactElement) {
	return <MainLayout>{page}</MainLayout>
};

export default Page;
