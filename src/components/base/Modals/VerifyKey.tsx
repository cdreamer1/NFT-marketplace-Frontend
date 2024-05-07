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
	HStack,
	PinInput,
	PinInputField,
	useToast,
} from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import { Address, checksumAddress } from 'viem';
import { useAccount } from 'wagmi';
import PinkButton from '@/components/base/Buttons/PinkButton'
import { BACKEND_HOST } from '@/constants/env';

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	setVerified: () => void,
};

const VerifyKeyModal = ({ onModalClose, isModalOpen, setVerified }: ModalProps) => {
	const { t } = useTranslation('common');
	const toast = useToast();
	const { address, isConnected } = useAccount();
	const cAddress = address ? checksumAddress(address as Address) : '0x0';
	const [isConfirming, toggleIsConfirming] = useState(false);
	const [code, setCode] = useState<string>('');

	const handleChange = (value: string) => {
		setCode(value);
	};

	async function confirmVerification() {
		if (isConnected && cAddress) {
			toggleIsConfirming(true);
			try {
				const resEmailAuth = await fetch(`${BACKEND_HOST}api/auth/confirm_email`, {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					},
					method: "POST",
					body: JSON.stringify({
						address: cAddress,
						key: code
					})
				});

				if (resEmailAuth.status === 200) {
					setVerified();
					toast({
						title: t('email_verification_success'),
						status: 'success',
						isClosable: true,
					});
					onModalClose();
				} else {
					toast({
						title: t('email_verification_failed'),
						status: 'error',
						isClosable: true,
					});
				}
			} catch (error) {
				toast({
					title: t('email_verification_failed'),
					status: 'error',
					isClosable: true,
				});
			}
			toggleIsConfirming(false);
		} else {
			toast({
				title: t('please_connect_wallet'),
				status: 'warning',
				isClosable: true,
			});
		}
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
						{t('input_verification')}
					</Text>
					{/* <Flex direction="column"> */}
					<HStack direction={['column', 'row']} spacing="1.5rem" mb={{ base: '3rem', lg: '4rem' }}>
						<PinInput onChange={handleChange}>
							<PinInputField />
							<PinInputField />
							<PinInputField />
							<PinInputField />
							<PinInputField />
							<PinInputField />
						</PinInput>
					</HStack>
					<Box
						h="2.625rem"
						w="100%"
					>
						<PinkButton
							isLoading={isConfirming}
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={confirmVerification}
							disabled={!isConnected}
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

export default VerifyKeyModal;