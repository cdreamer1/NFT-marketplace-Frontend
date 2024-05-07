import React, { useState } from 'react'
import {
	FlexProps,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	Text,
	Box,
	NumberInput,
	NumberInputField,
	Flex,
	Tabs,
	TabList,
	TabPanels,
	Tab,
	TabPanel,
	InputGroup,
	Input,
	InputRightAddon,
	Select,
	VStack,
	Grid,
	useToast
} from '@chakra-ui/react'
import { readContract, writeContract, waitForTransaction } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { Address } from 'viem'
import auctionJson from '@/abis/AlivelandAuction.json'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import marketplaceJson from '@/abis/AlivelandMarketplace.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import {
	marketplaceProxyContract,
	proxyAdminContract,
	MaticToken,
	USDTToken,
	WETHToken,
	platformFee,
	auctionProxyContract
} from '@/constants/data'
import { CHAIN_ID } from '@/constants/env'
import { PriceInfoType } from '@/lib/types'
import { calculatePriceForContract } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	royalty: number,
	nftAddress: Address,
	mediaType?: string,
	tokenId: number,
	nftType: string,
	setAuctionState: (_state: string) => void,
	setIsListed: (_isListed: boolean) => void,
	setPriceInfo: (_priceInfo: PriceInfoType) => void,
}

const Sell = ({ onModalClose, isModalOpen, royalty, nftAddress, mediaType, tokenId, nftType, setAuctionState, setIsListed, setPriceInfo }: ModalProps) => {
	const { t } = useTranslation('common');
	const [payToken, setPayToken] = useState(MaticToken[CHAIN_ID]);
	const [viewPrice, setViewPrice] = useState(0);
	const [minPrice, setMinPrice] = useState(0);
	const [isSale, toggleIsSale] = useState(false);
	const [isAuction, toggleIsAuction] = useState(false);
	const [openTime, setOpenTime] = useState(0);
	const [closeTime, setCloseTime] = useState(0);
	const toast = useToast();

	async function sellItem() {
		toggleIsSale(true);
		try {
			const marketplaceAddress = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [marketplaceProxyContract[CHAIN_ID]],
			});

			const { hash } = await writeContract({
				address: nftAddress,
				abi: nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
				functionName: 'setApprovalForAll',
				args: [
					marketplaceAddress,
					true
				],
			});
			await waitForTransaction({ hash });

			const { hash: hash_list } = await writeContract({
				address: marketplaceAddress as Address,
				abi: marketplaceJson.abi,
				functionName: 'listItem',
				args: [
					nftAddress,
					mediaType,
					tokenId,
					1,
					payToken,
					calculatePriceForContract(viewPrice, payToken),
					Math.floor(Date.now() / 1000),
				],
			});
			await waitForTransaction({ hash: hash_list });

			setPriceInfo({ price: viewPrice, payToken: payToken });
			setIsListed(true);

			toast({
				title: t('listing_success'),
				status: 'success',
				isClosable: true,
			});
			onModalClose();
		} catch (error) {
			toast({
				title: t('listing_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
		toggleIsSale(false);
	}

	async function createAuction() {
		toggleIsAuction(true);
		try {
			const auctionContract = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [auctionProxyContract[CHAIN_ID]],
			});

			const { hash } = await writeContract({
				address: nftAddress,
				abi: nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
				functionName: 'setApprovalForAll',
				args: [
					auctionContract,
					true
				],
			});
			await waitForTransaction({ hash });

			const { hash: hash_auction } = await writeContract({
				address: auctionContract as Address,
				abi: auctionJson.abi,
				functionName: 'createAuction',
				args: [
					nftAddress,
					tokenId,
					mediaType,
					payToken,
					calculatePriceForContract(minPrice, payToken),
					openTime,
					false,
					closeTime,
				],
			});
			await waitForTransaction({ hash: hash_auction });

			setPriceInfo({ price: minPrice, payToken: payToken });
			setAuctionState('CREATED');
			setIsListed(true);

			toast({
				title: t('create_auction_success'),
				status: 'success',
				isClosable: true,
			});
			onModalClose();
		} catch (error) {
			toast({
				title: t('create_auction_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
		toggleIsAuction(false);
	}

	return (
		<Modal
			isOpen={isModalOpen}
			onClose={onModalClose}
			size={{ base: 'base', md: 'md', lg: 'lg' }}
		>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader pt={{ base: '2rem', lg: '6.125rem' }}>
					<ModalCloseButton top={{ base: '2rem', lg: '2.75rem' }} right={{ base: '0.5rem', lg: '2.25rem' }} size="lg" />
				</ModalHeader>
				<ModalBody padding={{ base: '0rem 1rem', lg: '0rem 3rem' }}>
					<Text fontWeight={700} fontSize="1.75rem" lineHeight={1.1} textAlign="center" color="text.black" mb="3.375rem">
						{t('sell_nft')}
					</Text>
					<Tabs isFitted variant="enclosed">
						<TabList mb="1rem">
							<Tab>{t('fixed_price')}</Tab>
							<Tab>{t('time_auction')}</Tab>
						</TabList>
						<TabPanels>
							<TabPanel>
								<Text mb="1rem" fontWeight={500} fontSize="1.2rem" lineHeight={1} color="text.black">{t('fixed_price')}</Text>
								<InputGroup mb="0.5rem">
									<NumberInput w="100%">
										<NumberInputField value={viewPrice} onChange={(e) => { setViewPrice(parseFloat(e.target.value)) }} />
									</NumberInput>
									<InputRightAddon p={0}>
										<Select border="none" onChange={(e) => { setPayToken(e.target.value as `0x${string}`) }}>
											<option value={MaticToken[CHAIN_ID]}>MATIC</option>
											<option value={USDTToken[CHAIN_ID]}>USDT</option>
											<option value={WETHToken[CHAIN_ID]}>WETH</option>
										</Select>
									</InputRightAddon>
								</InputGroup>
								<Flex justify="end" mb="3rem">
									<VStack gap={0}>
										<Text>{t('platform_fee')}: {platformFee / 100}%</Text>
										<Text>{t('royalty_fee')}: {royalty / 100}%</Text>
									</VStack>
								</Flex>
								<Box w="100%" h="2.625rem">
									<PinkButton
										isLoading={isSale}
										fontSize="1.25rem"
										borderWidth="0.1875rem"
										onClick={sellItem}
									>
										{t('sell_item')}
									</PinkButton>
								</Box>
							</TabPanel>
							<TabPanel>
								<Text mb="1rem" fontWeight={500} fontSize="1.2rem" lineHeight={1} color="text.black">{t('time_auction')}</Text>
								<Grid mb="1.5rem" templateColumns={{ base: 'repeat(1, 1fr)'/*, lg: 'repeat(2, 1fr)'*/ }} gap={{ base: '0.5rem', md: '0.7rem' }}>
									<Box>
										<Text mb="1rem" fontWeight={300} fontSize="1rem" lineHeight={1} color="text.black">{t('open_time')}</Text>
										<Input
											placeholder="Select Date and Time"
											size="md"
											type="datetime-local"
											min={new Date().toISOString().split('.')[0]}
											onChange={(e) => setOpenTime(new Date(e.target.value).getTime() / 1000)}
										/>
									</Box>
									<Box>
										<Text mb="1rem" fontWeight={300} fontSize="1rem" lineHeight={1} color="text.black">{t('close_time')}</Text>
										<Input
											placeholder="Select Date and Time"
											size="md"
											type="datetime-local"
											min={new Date().toISOString().split('.')[0]}
											onChange={(e) => setCloseTime(new Date(e.target.value).getTime() / 1000)}
										/>
									</Box>
								</Grid>
								<Text mb="1rem" fontWeight={500} fontSize="1.2rem" lineHeight={1} color="text.black">{t('min_price')}</Text>
								<InputGroup mb="0.5rem">
									<NumberInput w="100%">
										<NumberInputField value={minPrice} onChange={(e) => { setMinPrice(parseFloat(e.target.value)) }} />
									</NumberInput>
									<InputRightAddon p={0}>
										<Select border="none" onChange={(e) => { setPayToken(e.target.value as `0x${string}`) }}>
											<option value={MaticToken[CHAIN_ID]}>MATIC</option>
											<option value={USDTToken[CHAIN_ID]}>USDT</option>
											<option value={WETHToken[CHAIN_ID]}>WETH</option>
										</Select>
									</InputRightAddon>
								</InputGroup>
								<Flex justify="end" mb="3rem">
									<VStack gap={0}>
										<Text>{t('platform_fee')}: {platformFee / 100}%</Text>
										<Text>{t('royalty_fee')}: {royalty / 100}%</Text>
									</VStack>
								</Flex>
								<Box w="100%" h="2.625rem">
									<PinkButton
										isLoading={isAuction}
										fontSize="1.25rem"
										borderWidth="0.1875rem"
										onClick={createAuction}
									>
										{t('sell_item')}
									</PinkButton>
								</Box>
							</TabPanel>
						</TabPanels>
					</Tabs>
				</ModalBody>
				<ModalFooter height={{ base: '3rem', lg: '6rem' }} />
			</ModalContent>
		</Modal>
	);
}

export default Sell;