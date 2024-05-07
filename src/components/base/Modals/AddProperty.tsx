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
	HStack,
} from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import PinkButton from '@/components/base/Buttons/PinkButton'

export type PropertyType = {
	type: string;
	name: string;
};

interface ModalProps extends FlexProps {
	onModalClose: () => void,
	isModalOpen: boolean,
	properties: Array<PropertyType>,
	setProperties: (properties: Array<PropertyType>) => void,
};

const AddProperty = ({ onModalClose, isModalOpen, properties, setProperties }: ModalProps) => {
	const { t } = useTranslation('common');

	const [values, setValues] = useState<Array<PropertyType>>(properties);

	useEffect(() => {
		if (isModalOpen) {
			const props = [...properties];
			if (props.length === 0) {
				props.push({ type: '', name: '' });
			}
			setValues(props);
		}
	}, [isModalOpen]);

	function saveProperties() {
		setProperties([...values]);
		onModalClose();
	}

	function remove(indx: number) {
		const newValues = [...values];
		setValues(newValues.filter((_, i) => i != indx));
	}

	function onChange(evt: ChangeEvent<HTMLInputElement>, inputType: string, indx: number) {
		const value = evt.target.value;
		const newValues = [...values];
		if (value.length !== 0 && newValues.length === indx + 1) {
			newValues.push({ type: '', name: '' });
		}
		if (inputType === 'type') {
			newValues[indx].type = value;
		} else if (inputType === 'name') {
			newValues[indx].name = value;
		}
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
						{t('add_properties')}
					</Text>
					<Flex direction="column" mb={{ base: '3rem', lg: '4rem' }}>
						{
							values.map((property, index) =>
							(<HStack spacing="1rem" key={index} mb={3}>
								<Input
									type="text"
									placeholder="Enter Type"
									value={property.type}
									onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e, "type", index)}
								/>
								<Input
									type="text"
									placeholder="Enter Name"
									value={property.name}
									onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e, "name", index)}
								/>
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
							onClick={saveProperties}
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

export default AddProperty;