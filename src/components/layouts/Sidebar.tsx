'use client'

import {
  Box,
  Flex,
  Icon,
  useColorModeValue,
  Text,
  BoxProps,
  FlexProps,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { IconType } from 'react-icons'
import {
  BsHouseDoorFill,
  BsCart3,
  BsAward,
  BsStars,
  BsVectorPen,
  BsReception4,
  BsPeople,
  BsFileEarmarkText,
} from 'react-icons/bs'
import {
  FaDiscord, FaTwitter
} from 'react-icons/fa'

interface LinkItemProps {
  name: string
  icon?: IconType
  children?: LinkItemProps[],
  href?: string
};

interface NavItemProps extends FlexProps {
  icon?: IconType
  children: React.ReactNode
  isParent?: boolean,
  isChild?: boolean,
  href?: string,
  primary?: boolean
};

const Sidebar = ({ ...rest }: BoxProps) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const routes = router.pathname.split('/');

  const LinkItems: Array<LinkItemProps> = [
    { name: t('home'), icon: BsHouseDoorFill, href: '/' },
    { name: t('marketplace'), href: '/marketplace', icon: BsCart3 },
    { name: t('nft_launchpad'), icon: BsAward, href: '/launchpad' },
    { name: t('collections'), icon: BsStars, href: '/collections' },
    {
      name: t('create'),
      icon: BsVectorPen,
      href: '/create',
      children: [
        { name: t('collection'), href: '/create/collection' },
        { name: t('nft'), href: '/create/nft' }
      ]
    },
    {
      name: t('statistics'),
      icon: BsReception4,
      href: '/stats',
      children: [
        { name: t('ranking'), href: '/stats/ranking' },
        { name: t('activity'), href: '/stats/activity' }
      ]
    },
    {
      name: t('community'),
      icon: BsPeople,
      href: '/community',
      children: [
        { name: t('discord'), icon: FaDiscord, href: 'https://discord.gg/2PDhByzx' },
        { name: t('twitter'), icon: FaTwitter, href: 'https://twitter.com/alive_land' }
      ]
    },
    { name: t('whitepaper'), icon: BsFileEarmarkText, href: 'https://aliveland-organization.gitbook.io/raibu-white-paper/overview/alive-land-gai-yao' }
  ];

  return (
    <Box
      transition="3s ease"
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: '2xs' }}
      px={3.5}
      py={5}
      h="auto"
      pos="absolute"
      top={{ base: 0, md: '4.5rem' }}
      bottom={0}
      {...rest}>
      {LinkItems.map((link) => {
        return link.children ?
          <Accordion allowToggle key={link.name} defaultIndex={link.href?.substring(1) == routes[1] ? 0 : -1}>
            <AccordionItem border={0}>
              <AccordionButton p={0} _hover={{ bg: 'transparent' }}>
                <NavItem icon={link.icon} isParent primary={link.href?.substring(1) == routes[1]}>
                  {link.name}
                </NavItem>
              </AccordionButton>
              <AccordionPanel p={0}>
                {link.children.map((sublink) => (
                  <NavItem key={sublink.name} icon={sublink.icon} isChild href={sublink.href} primary={sublink.href == router.pathname}>
                    {sublink.name}
                  </NavItem>
                ))}
              </AccordionPanel>
            </AccordionItem>
          </Accordion> :
          <NavItem key={link.name} icon={link.icon} href={link.href} primary={link.href?.substring(1) == routes[1]}>
            {link.name}
          </NavItem>
      })}
    </Box>
  )
}

const NavItem = ({ icon, children, isParent, isChild, href, primary, ...rest }: NavItemProps) => {
  return (
    <Box
      as="a"
      href={href}
      width="full"
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}>
      <Flex
        align="center"
        px={3.5}
        py={3}
        borderRadius="full"
        role="group"
        cursor="pointer"
        bg={primary && !isChild ? 'gradient.pink' : 'transparent'}
        color={primary && !isChild ? 'white' : 'black'}
        _hover={{
          bg: 'gray.200',
          color: 'white',
        }}
        {...rest}>
        {icon && (
          <Icon
            mr={4}
            fontSize="1.5rem"
            _groupHover={{
              color: 'white',
            }}
            as={icon}
          />
        )}
        <Flex justifyContent="space-between" flexGrow={1}>
          <Text
            fontSize="1rem"
            fontWeight="semibold"
            bgClip={isChild && primary ? 'text' : ''}
            bgGradient={isChild && primary ? 'linear(90deg, #9700CC 2.21%, #C200E1 100.22%)' : 'none'}
          >
            {children}
          </Text>
          {isParent && <AccordionIcon fontSize="1.5rem" />}
        </Flex>
      </Flex>
    </Box>
  );
}

export default Sidebar;