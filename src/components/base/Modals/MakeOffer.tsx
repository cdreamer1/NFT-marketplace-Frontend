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
	Center,
	Flex,
	Checkbox,
	Divider,
	Grid,
	Image,
	Spacer,
	Input,
	Box,
	Select,
	InputGroup,
	InputRightAddon,
	NumberInput,
	NumberInputField,
	HStack,
	useToast,
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
	USDTTokenABI,
	WETHTokenABI,
	TokenName,
	platformFee
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
	royalty: number,
	setIsOffered: (_isListed: boolean) => void,
};

const MakeOffer = ({ onModalClose, isModalOpen, nftAddress, tokenId, owner, item_img, item_name, royalty, setIsOffered }: ModalProps) => {
	const { t } = useTranslation('common');
	const toast = useToast();
	const [payToken, setPayToken] = useState(MaticToken[CHAIN_ID]);
	const [isOffering, toggleIsOffering] = useState(false);
	const [deadline, setDeadline] = useState(0);
	const [price, setPrice] = useState(0);
	const [checkedItem, setCheckedItem] = useState(false);

	async function makeOffer() {
		toggleIsOffering(true);
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
				functionName: 'createOffer',
				args: [
					nftAddress,
					owner,
					tokenId,
					payToken,
					1,
					calculatePriceForContract(price, payToken),
					deadline,
				],
				value: payToken == MaticToken[CHAIN_ID] ? parseEther(price.toString()) : BigInt(0)
			});
			await waitForTransaction({ hash });

			setIsOffered(true);
			onModalClose();
			toast({
				title: t('offer_success'),
				status: 'success',
				isClosable: true,
			});
		} catch (error) {
			console.log(error);
			toast({
				title: t('offer_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
		}
		toggleIsOffering(false);
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
						{t('make_offer')}
					</Text>
					<Flex direction="column" mb={{ base: '0.5rem', lg: '1.375rem' }}>
						<Grid
							templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
							gap={{ base: '0.5rem', md: '0.7rem' }}
						>
							<HStack>
								<Image borderRadius="full" boxSize="2.25rem" bg="text.dark" src={item_img} />
								<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.dark">{item_name}</Text>
							</HStack>
							<InputGroup>
								<NumberInput>
									<NumberInputField value={price} onChange={(e) => { setPrice(parseFloat(e.target.value)) }} />
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
						<Divider borderColor="black" size="1px" my="2rem" />
						<Box mb="1.5rem">
							<Text mb="0.5rem" fontWeight={500} fontSize="1.2rem" lineHeight={1} color="text.black">{t('offer_expiration')}</Text>
							<Input
								placeholder="Select Date and Time"
								size="md"
								type="datetime-local"
								min={new Date().toISOString().split('.')[0]}
								onChange={(e) => setDeadline(new Date(e.target.value).getTime() / 1000)}
							/>
						</Box>
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
					<Box
						h="2.625rem"
						w="100%"
					>
						<PinkButton
							disabled={!checkedItem}
							isLoading={isOffering}
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={makeOffer}
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

export default MakeOffer;