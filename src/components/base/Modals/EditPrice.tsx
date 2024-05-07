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
	Box,
	NumberInput,
	NumberInputField,
	Select,
	InputGroup,
	InputRightAddon,
	Flex,
	Grid,
	HStack,
	Divider,
	Image,
	Center,
	Checkbox,
	Spacer,
	useToast
} from '@chakra-ui/react'
import { readContract, writeContract, waitForTransaction } from '@wagmi/core'
import { parseEther } from 'ethers'
import { useTranslation } from 'next-i18next'
import { Address } from 'viem'
import marketplaceJson from '@/abis/AlivelandMarketplace.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import {
	marketplaceProxyContract,
	proxyAdminContract,
	MaticToken,
	USDTToken,
	WETHToken,
	TokenName,
	platformFee
} from '@/constants/data'
import { CHAIN_ID } from '@/constants/env'
import { PriceInfoType } from '@/lib/types'
import { showError } from '@/utils/exceptionHandler'

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	nftAddress: Address,
	tokenId: number,
	item_img?: string,
	item_name: string,
	royalty: number,
	priceInfo: PriceInfoType,
	setPriceInfo: (_priceInfo: PriceInfoType) => void,
}

const EditPrice = ({ onModalClose, isModalOpen, nftAddress, tokenId, item_img, item_name, royalty, priceInfo, setPriceInfo }: ModalProps) => {
	const { t } = useTranslation('common');
	const [payToken, setPayToken] = useState(MaticToken[CHAIN_ID]);
	const [viewPrice, setViewPrice] = useState(0);
	const [isEdit, toggleIsEdit] = useState(false);
	const [checkedItem, setCheckedItem] = useState(false);
	const toast = useToast();

	useEffect(() => {
		if (priceInfo) {
			setViewPrice(priceInfo.price);
			setPayToken(priceInfo.payToken);
		}
	}, [isModalOpen]);

	async function editPrice() {
		toggleIsEdit(true);
		try {
			const marketplaceAddress = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [marketplaceProxyContract[CHAIN_ID]],
			});

			const { hash } = await writeContract({
				address: marketplaceAddress as Address,
				abi: marketplaceJson.abi,
				functionName: 'updateListing',
				args: [
					nftAddress,
					tokenId,
					payToken,
					payToken === USDTToken[CHAIN_ID] ? BigInt(viewPrice * 1000000) : parseEther(viewPrice.toString()),
				],
			});
			await waitForTransaction({ hash });

			setPriceInfo({ price: viewPrice, payToken: payToken });

			toast({
				title: t('edit_price_success'),
				status: 'success',
				isClosable: true,
			});
			onModalClose();
		} catch (error) {
			toast({
				title: t('edit_price_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
		toggleIsEdit(false);
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
						{t('edit_price')}
					</Text>
					<Flex direction="column" mb={{ base: '0.5rem', lg: '1.375rem' }}>
						<Flex>
							<Grid
								templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
								gap={{ base: '0.5rem', md: '0.7rem' }}
							>
								<HStack>
									<Image borderRadius="full" boxSize="2.25rem" bg="text.dark" src={item_img} />
									<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.dark">{item_name}</Text>
								</HStack>
								<InputGroup>
									<NumberInput w="100%">
										<NumberInputField defaultValue={viewPrice} value={viewPrice} onChange={(e) => { setViewPrice(parseFloat(e.target.value)) }} />
									</NumberInput>
									<InputRightAddon p={0}>
										<Select border="none" onChange={(e) => { setPayToken(e.target.value as `0x${string}`) }}>
											<option value={MaticToken[CHAIN_ID]}>MATIC</option>
											<option value={USDTToken[CHAIN_ID]}>USDT</option>
											<option value={WETHToken[CHAIN_ID]}>WETH</option>
										</Select>
									</InputRightAddon>
								</InputGroup>
							</Grid>
							<Spacer />
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
						<Flex direction="column" gap="1rem" fontSize="1.125rem" lineHeight={1} color="text.black">
							<Text fontWeight={700}>{t('fee_detail')}</Text>
							<Flex>
								<Text fontWeight={500}>{t('platform_fee')}</Text>
								<Spacer />
								<Text fontWeight={500}>{viewPrice * platformFee / 10000} {TokenName[payToken]}({platformFee / 100}%)</Text>
							</Flex>
							<Flex>
								<Text fontWeight={500}>{t('royalty_fee')}</Text>
								<Spacer />
								<Text fontWeight={500}>{viewPrice * royalty / 10000} {TokenName[payToken]}({royalty / 100}%)</Text>
							</Flex>
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
						<Flex>
							<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
								{t('purchase_amount')}
							</Text>
							<Spacer />
							<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
								{viewPrice} {TokenName[payToken]}
							</Text>
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
					</Flex>
					<Center mb={{ base: '2rem', lg: '3.375rem' }} fontSize="0.75rem" lineHeight={1.4}>
						<Checkbox colorScheme="gray" borderColor="none" onChange={(e) => setCheckedItem(e.target.checked)}>
							{t('terms_of_service')}
						</Checkbox>
					</Center>
					<Box
						h="2.625rem"
						w="100%"
					>
						<PinkButton
							disabled={!checkedItem}
							isLoading={isEdit}
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={editPrice}
						>
							{t('confirm')}
						</PinkButton>
					</Box>
				</ModalBody>
				<ModalFooter height={{ base: '3rem', lg: '6rem' }} />
			</ModalContent>
		</Modal>
	);
}

export default EditPrice;