'use client'

import {
	ButtonGroup,
	IconButton,
	HStack,
	Box,
	Image,
	Stack,
	Text,
	Divider,
	Link
} from '@chakra-ui/react'
import { useTranslation } from "next-i18next"
import { FaTwitter, FaDiscord/*, FaLinkedinIn, FaInstagram*/ } from 'react-icons/fa'
import { staticPath } from '@/lib/$path'

const Footer = () => {
	const { t } = useTranslation('common');

	return (
		<Box
			bg="black"
			color="white"
			pl={{ base: '1rem', md: '18.5rem' }}
			pr={{ base: '1rem', md: '2.5rem' }}
			py={{ base: '1rem', md: '3.75rem' }}>
			<Stack spacing="1.5rem">
				<Stack justify="space-between" direction="row" align="center">
					<HStack>
						<Image src={staticPath.logo_simple_png} alt="Logo" />
						<Image src={staticPath.logo_png} alt="Logo" display={{ base: 'none', md: 'block' }} />
					</HStack>
					<ButtonGroup variant="tertiary">
						<IconButton as="a" _hover={{ color: 'gray.400' }} href="https://twitter.com/alive_land" fontSize="1.5rem" aria-label="Twitter" icon={<FaTwitter />} />
						<IconButton as="a" _hover={{ color: 'gray.400' }} href="https://discord.gg/2PDhByzx" fontSize="1.5rem" aria-label="Discord" icon={<FaDiscord />} />
						{/* To be implemented in next stage */}
						{/* <IconButton as="a" _hover={{ color: 'gray.400' }} href="#" fontSize="1.5rem" aria-label="Instagram" icon={<FaInstagram />} />
						<IconButton as="a" _hover={{ color: 'gray.400' }} href="#" fontSize="1.5rem" aria-label="LinkedIn" icon={<FaLinkedinIn />} /> */}
					</ButtonGroup>
				</Stack>
				<Stack
					direction={{ base: 'column', lg: 'row' }}
					spacing={{ base: '0.5rem', md: '1.25rem' }}
					fontSize="0.875rem"
					fontWeight={500}
					padding="0.75rem 0.5rem 0.75rem 0.5rem"
				>
					<Link href={'/'}>{t('home')}</Link>
					<Link href={'/marketplace'}>{t('marketplace')}</Link>
					<Link href={'/launchpad'}>{t('nft_launchpad')}</Link>
					<Link href={'/collections'}>{t('collections')}</Link>
					<Link href={'/create/collection'}>{t('create')}</Link>
					<Link href={'/stats/ranking'}>{t('statistics')}</Link>
					<Link href={'#'}>{t('community')}</Link>
					<Link href={'https://aliveland-organization.gitbook.io/raibu-white-paper/overview/alive-land-gai-yao'}>{t('whitepaper')}</Link>
				</Stack>
				<Divider />
				<Text fontSize="0.875rem" lineHeight="1.225rem">
					Aliveland &copy; 2023. All rights reserved.
				</Text>
			</Stack>
		</Box>
	);
}

export default Footer;