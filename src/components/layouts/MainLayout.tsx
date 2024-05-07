'use client'

import { ReactNode } from 'react'
import {
  Box,
  useColorModeValue,
  Drawer,
  DrawerContent,
  useDisclosure,
  DrawerOverlay,
} from '@chakra-ui/react'
import Footer from './Footer'
import MobileNav from './MobileNav'
import Sidebar from './Sidebar'

const MainLayout = ({ children }: { children: ReactNode }) => {
  const {
    isOpen: isSideOpen,
    onClose: onSideClose,
    onToggle: onSideToggle
  } = useDisclosure();

  return (
    <Box minH="100vh" bg={useColorModeValue('white', 'gray.900')} display="flex" flexDirection="column">
      {/* mobilenav */}
      <MobileNav onSideToggle={onSideToggle} />
      <Sidebar display={{ base: 'none', md: 'block' }} />
      <Drawer
        isOpen={isSideOpen}
        placement="left"
        onClose={onSideClose}
        returnFocusOnClose={false}
        onOverlayClick={onSideClose}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent
          containerProps={{
            h: 'auto',
            top: '3.5rem',
            bottom: 0,
          }}
          style={{ position: 'absolute' }}
          maxW="16rem"
        >
          <Sidebar />
        </DrawerContent>
      </Drawer>
      <Box ml={{ base: 0, md: '16rem' }} p={0} flexGrow={1} position="relative">
        {children}
      </Box>
      <Footer />
    </Box>
  );
}

export default MainLayout;