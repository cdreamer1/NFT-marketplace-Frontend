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
	Flex,
	Divider,
	Image,
	Spacer,
	Box,
	HStack,
	useToast,
} from '@chakra-ui/react'
import { readContract, writeContract, waitForTransaction } from '@wagmi/core'
import { useTranslation } from 'next-i18next'
import { Address } from 'viem'
import { useNFTStore } from '../../../../store/useDataStore'
import useStore from '../../../../store/useStore'
import erc721Json from '@/abis/AlivelandERC721.json'
import marketplaceJson from '@/abis/AlivelandMarketplace.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import {
	marketplaceProxyContract,
	proxyAdminContract,
	TokenName,
} from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { calculatePrice } from '@/utils/calc'
import { showError } from '@/utils/exceptionHandler'
import { generateIPFSURL } from '@/utils/fetch'

type Offers = {
	pricePerItem: number;
	payToken: Address;
	creator: Address;
	blockTimestamp: number;
	deadline: number;
};

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	nftAddress: Address,
	tokenId: number,
	item_img?: string,
	item_name: string,
	offerSelected: Offers,
	setIsOffered: (_isListed: boolean) => void,
	setIsOwner: (_isOwner: boolean) => void,
};

const AcceptOffer = ({ onModalClose, isModalOpen, nftAddress, tokenId, item_img, item_name, offerSelected, setIsOffered, setIsOwner }: ModalProps) => {
	const { t } = useTranslation('common');
	const toast = useToast();
	const [isAccepting, toggleIsAccepting] = useState(false);
	const nftInfo = useStore(useNFTStore, (state) => state.nftInfo);
	const setNFTInfo = useNFTStore((state) => state.setNFTInfo);

	async function acceptOffer() {
		toggleIsAccepting(true);
		try {
			const marketplaceAddress = await readContract({
				address: proxyAdminContract[CHAIN_ID],
				abi: proxyAdminJson.abi,
				functionName: 'getProxyImplementation',
				args: [marketplaceProxyContract[CHAIN_ID]],
			});

			const { hash } = await writeContract({
				address: nftAddress,
				abi: erc721Json.abi,
				functionName: 'setApprovalForAll',
				args: [
					marketplaceAddress,
					true
				],
			});
			await waitForTransaction({ hash });

			const { hash: _hash } = await writeContract({
				address: marketplaceAddress as Address,
				abi: marketplaceJson.abi,
				functionName: 'acceptOffer',
				args: [
					nftAddress,
					tokenId,
					offerSelected.creator
				],
			});
			await waitForTransaction({ hash: _hash });

			toast({
				title: t('accept_offer_success'),
				status: 'success',
				isClosable: true,
			});

			// Get info of new owner			
			const response = await fetch(`${BACKEND_HOST}api/user/${offerSelected.creator}`, {
				method: "GET",
			});
			const resJson = response.status === 200 ? await response.json() : null;
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
				owner: offerSelected.creator,
				ownerName: resJson ? resJson.UserName : 'No Name',
				ownerImage: generateIPFSURL(resJson?.AvatarImage || '', 40, 40, 'cover'),
			});

			setIsOffered(false);
			setIsOwner(false);
			onModalClose();
		} catch (error) {
			toast({
				title: t('accept_offer_failed'),
				status: 'error',
				isClosable: true,
			});
			showError(error, toast, t);
			console.log(error);
		}
		toggleIsAccepting(false);
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
						{t('accept_offer')}
					</Text>
					<Flex direction="column" mb={{ base: '3rem', lg: '4rem' }}>
						<HStack>
							<Image borderRadius="full" boxSize="3rem" bg="text.dark" src={item_img} />
							<Text fontSize="1rem" fontWeight={600} lineHeight={1} color="text.dark">{item_name}</Text>
						</HStack>
						<Divider borderColor="black" size="1px" my="2rem" />
						<Flex>
							<Text mb="0.5rem" fontWeight={500} fontSize="1.2rem" lineHeight={1} color="text.black">{t('offer_expiration')}</Text>
							<Spacer />
							<Text fontWeight={500} fontSize="1.2rem" lineHeight={1} color="text.black">{(new Date(offerSelected?.deadline * 1000)).toLocaleString()}</Text>
						</Flex>
						<Divider borderColor="black" size="1px" my="2rem" />
						<Flex>
							<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
								{t('offer_amount')}
							</Text>
							<Spacer />
							<Text fontWeight={700} fontSize="1.125rem" lineHeight={1} color="text.black">
								{calculatePrice(offerSelected?.pricePerItem, offerSelected?.payToken || '0x0')} {TokenName[offerSelected?.payToken]}
							</Text>
						</Flex>
					</Flex>
					<Box
						h="2.625rem"
						w="100%"
					>
						<PinkButton
							isLoading={isAccepting}
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={acceptOffer}
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

export default AcceptOffer;