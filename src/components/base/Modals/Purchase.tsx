import React, { useEffect, useState } from 'react'
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
	Grid,
	Center,
	Flex,
	Checkbox,
	Divider,
	HStack,
	Image,
	Spacer,
	useToast
} from '@chakra-ui/react'
import { readContract, writeContract, waitForTransaction } from '@wagmi/core'
import { parseEther } from 'ethers'
import { useTranslation } from 'next-i18next'
import { Address } from 'viem'
import { useNFTStore, useUserStore } from '../../../../store/useDataStore'
import useStore from '../../../../store/useStore'
import marketplaceJson from '@/abis/AlivelandMarketplace.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import {
	marketplaceProxyContract,
	proxyAdminContract,
	TokenName,
	platformFee,
	USDTToken,
	WETHToken,
	USDTTokenABI,
	WETHTokenABI,
} from '@/constants/data'
import { CHAIN_ID } from '@/constants/env'
import { calculatePriceForContract } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	nftAddress: Address,
	tokenId: number,
	owner: Address,
	item_img?: string,
	item_name: string,
	price: number,
	payToken: Address,
	royalty: number,
	setIsListed: (_isListed: boolean) => void,
	setIsOwner: (_isOwner: boolean) => void,
};

const Purchase = ({ onModalClose, isModalOpen, nftAddress, tokenId, owner, item_img, item_name, price, payToken, royalty, setIsListed, setIsOwner }: ModalProps) => {
	const { t } = useTranslation('common');
	const [isBuying, toggleIsBuying] = useState(false);
	const [checkedItem, setCheckedItem] = useState(false);
	const nftInfo = useStore(useNFTStore, (state) => state.nftInfo);
	const setNFTInfo = useNFTStore((state) => state.setNFTInfo);
	const userInfo = useStore(useUserStore, (state) => state.userInfo);
	const toast = useToast();

	async function buyItem() {
		toggleIsBuying(true);
		try {
			const marketplaceAddress = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [marketplaceProxyContract[CHAIN_ID]],
			});

			if (payToken === USDTToken[CHAIN_ID]) {
				await writeContract({
					address: USDTToken[CHAIN_ID],
					abi: USDTTokenABI[CHAIN_ID],
					functionName: 'approve',
					args: [
						marketplaceAddress,
						BigInt(price * 1000000),
					],
				});
			} else if (payToken === WETHToken[CHAIN_ID]) {
				await writeContract({
					address: WETHToken[CHAIN_ID],
					abi: WETHTokenABI[CHAIN_ID],
					functionName: 'approve',
					args: [
						marketplaceAddress,
						parseEther(price.toString()),
					],
				});
			}

			const { hash } = await writeContract({
				address: marketplaceAddress as Address,
				abi: marketplaceJson.abi,
				functionName: 'buyItem',
				args: [
					nftAddress,
					tokenId,
					payToken,
					owner,
				],
				value: calculatePriceForContract(price, payToken),
			});
			await waitForTransaction({ hash });

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
				owner: userInfo?.address || '0x0',
				ownerName: userInfo?.name || '',
				ownerImage: userInfo?.avatarimg || ''
			});

			setIsListed(false);
			setIsOwner(true);
			onModalClose();
			toast({
				title: t('purchase_success'),
				status: 'success',
				isClosable: true,
			});
		} catch (error) {
			console.log(error);
			toast({
				title: t('purchase_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
		}
		toggleIsBuying(false);
	}

	useEffect(() => {
		if (!isModalOpen) {
			setCheckedItem(false);
		}
	}, [isModalOpen]);

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
						{t('purchase_cart')}
					</Text>
					<Flex direction="column" mb={{ base: '0.5rem', lg: '1.375rem' }}>
						<Flex>
							<HStack>
								<Image borderRadius="full" boxSize="2.25rem" bg="text.dark" src={item_img} />
								<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.dark">{item_name}</Text>
							</HStack>
							<Spacer />
							<Text
								padding="0.8125rem 2.625rem"
								borderWidth="1px"
								borderRadius="full"
								borderColor="text.dark"
								fontWeight={600}
								fontSize="1rem"
								lineHeight={1}
							>
								{price} {TokenName[payToken]}
							</Text>
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
						<Flex direction="column" gap="1rem" fontSize="1.125rem" lineHeight={1} color="text.black">
							<Text fontWeight={700}>{t('fee_detail')}</Text>
							<Flex>
								<Text fontWeight={500}>{t('platform_fee')}</Text>
								<Spacer />
								<Text fontWeight={500}>{price * platformFee / 10000} {TokenName[payToken]}({platformFee / 100}%)</Text>
							</Flex>
							<Flex>
								<Text fontWeight={500}>{t('royalty_fee')}</Text>
								<Spacer />
								<Text fontWeight={500}>{price * royalty / 10000} {TokenName[payToken]}({royalty / 100}%)</Text>
							</Flex>
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
						<Flex>
							<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
								{t('purchase_amount')}
							</Text>
							<Spacer />
							<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
								{price} {TokenName[payToken]}
							</Text>
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
					</Flex>
					<Center mb={{ base: '2rem', lg: '3.375rem' }} fontSize="0.75rem" lineHeight={1.4}>
						<Checkbox colorScheme="gray" borderColor="none" onChange={(e) => setCheckedItem(e.target.checked)}>
							{t('terms_of_service')}
						</Checkbox>
					</Center>
					<Grid
						templateColumns="repeat(2, 1fr)"
						gap={{ base: '0.5rem', lg: '1.875rem' }}
						h="2.625rem"
						w="100%"
					>
						<PinkButton
							disabled={!checkedItem}
							isLoading={isBuying}
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={buyItem}
						>
							{t('buy')}
						</PinkButton>
						<PinkButton
							disabled={true}
							isLoading={false}
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={() => { }}
						>
							{t('credit_card_payment')}
						</PinkButton>
					</Grid>
				</ModalBody>
				<ModalFooter height={{ base: '3rem', lg: '6rem' }} />
			</ModalContent>
		</Modal>
	);
}

export default Purchase;