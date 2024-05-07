import React, { ChangeEvent, useEffect, useState } from 'react'
import { DeleteIcon } from '@chakra-ui/icons';
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
	Box,
	Input,
	IconButton,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
	HStack,
} from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import PinkButton from '@/components/base/Buttons/PinkButton'

export type StatsType = {
	type: string;
	value: number;
};

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	stats: Array<StatsType>,
	setStats: (stats: Array<StatsType>) => void,
};

const AddStats = ({ onModalClose, isModalOpen, stats, setStats }: ModalProps) => {
	const { t } = useTranslation('common');

	const [values, setValues] = useState<Array<StatsType>>(stats);

	useEffect(() => {
		if (isModalOpen) {
			const props = [...stats];
			if (props.length === 0) {
				props.push({ type: '', value: 0 });
			}
			setValues(props);
		}
	}, [isModalOpen]);

	function saveStats() {
		setStats([...values]);
		onModalClose();
	}

	function remove(indx: number) {
		const newValues = [...values];
		setValues(newValues.filter((_, i) => i != indx));
	}

	function onChange(evt: ChangeEvent<HTMLInputElement>, indx: number) {
		const value = evt.target.value;
		const newValues = [...values];
		if (value.length !== 0 && newValues.length === indx + 1) {
			newValues.push({ type: '', value: 0 });
		}
		newValues[indx].type = value;
		setValues(newValues);
	}

	function onValueChange(str: string, indx: number) {
		const newValues = [...values];
		newValues[indx].value = parseInt(str);
		setValues(newValues);
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
						{t('add_stats')}
					</Text>
					<Flex direction="column" mb={{ base: '3rem', lg: '4rem' }}>
						{
							values.map((property, index) =>
							(<HStack spacing="1rem" key={index} mb={3}>
								<Input
									type="text"
									placeholder="Enter Type"
									value={property.type}
									onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e, index)}
								/>
								<NumberInput
									defaultValue={0} min={0} max={5}
									placeholder="Enter Value"
									value={property.value}
									onChange={(val: string) => onValueChange(val, index)}>
									<NumberInputField />
									<NumberInputStepper>
										<NumberIncrementStepper />
										<NumberDecrementStepper />
									</NumberInputStepper>
								</NumberInput>
								<IconButton
									variant="outline"
									aria-label="Delete"
									isDisabled={values.length === 1}
									icon={<DeleteIcon />}
									onClick={() => remove(index)}
								/>
							</HStack>)
							)
						}
					</Flex>
					<Box
						h="2.625rem"
						w="100%"
					>
						<PinkButton
							fontSize="1.25rem"
							borderWidth="0.1875rem"
							onClick={saveStats}
						>
							{t('save')}
						</PinkButton>
					</Box>
				</ModalBody>
				<ModalFooter height={{ base: '3rem', lg: '6rem' }} />
			</ModalContent>
		</Modal>
	);
}

export default AddStats;