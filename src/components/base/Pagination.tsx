import React from 'react';
import { ChevronRightIcon, ChevronLeftIcon } from '@chakra-ui/icons'
import { Box, Button, Text } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'

interface PageProps {
  totalPosts: number,
  postsPerPage: number,
  setCurrentPage: (page: number) => void,
  currentPage: number
};

const Pagination = ({ totalPosts, postsPerPage, setCurrentPage, currentPage }: PageProps) => {
  const { t } = useTranslation('common');

  const totalPages = Math.ceil(totalPosts / postsPerPage);

  return (
    <Box
      display="flex"
      flex-wrap="wrap"
      justifyContent="center"
    >
      {currentPage !== 1 && (
        <Button
          bg="white"
          _hover={{ bg: 'bg.pagination' }}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeftIcon pr="0.5rem" boxSize="2rem" />
          <Text display={{ base: 'none', md: 'block' }}>{t('previous')}</Text>
        </Button>
      )}

      <Button
        bg="transparent"
        borderRadius="50%"
        colorScheme="white"
        color="black"
        _hover={{ bg: 'bg.pagination' }}
        _active={currentPage === 1 ? {
          bg: 'gradient.pink',
          color: 'white'
        } : { colorScheme: 'white' }}
        isActive
        onClick={() => setCurrentPage(1)}
      >
        {1}
      </Button>

      {currentPage > 3 && <Text as="b" pt="0.25rem" px="0.75rem">...</Text>}

      {currentPage === totalPages && totalPages > 3 && (
        <Button
          bg="transparent"
          borderRadius="50%"
          colorScheme="white"
          color="black"
          _hover={{ bg: 'bg.pagination' }}
          isActive
          onClick={() => setCurrentPage(currentPage - 2)}
        >
          {currentPage - 2}
        </Button>
      )}

      {currentPage > 2 && (
        <Button
          bg="transparent"
          borderRadius="50%"
          colorScheme="white"
          color="black"
          _hover={{ bg: 'bg.pagination' }}
          isActive
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          {currentPage - 1}
        </Button>
      )}

      {currentPage !== 1 && currentPage !== totalPages && (
        <Button
          bg="transparent"
          borderRadius="50%"
          colorScheme="white"
          color="black"
          _hover={{ bg: 'bg.pagination' }}
          _active={{
            bg: 'gradient.pink',
            color: 'white'
          }}
          isActive
          onClick={() => setCurrentPage(currentPage)}
        >
          {currentPage}
        </Button>
      )}

      {currentPage < totalPages - 1 && (
        <Button
          bg="transparent"
          borderRadius="50%"
          colorScheme="white"
          color="black"
          _hover={{ bg: 'bg.pagination' }}
          isActive
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          {currentPage + 1}
        </Button>
      )}

      {currentPage === 1 && totalPages > 3 && (
        <Button
          bg="transparent"
          borderRadius="50%"
          colorScheme="white"
          color="black"
          _hover={{ bg: 'bg.pagination' }}
          isActive
          onClick={() => setCurrentPage(currentPage + 2)}
        >
          {currentPage + 2}
        </Button>
      )}

      {currentPage < totalPages - 2 && <Text as="b" pt="0.25rem" px="0.75rem">...</Text>}

      {totalPages > 1 && (
        <Button
          bg="transparent"
          borderRadius="50%"
          colorScheme="white"
          color="black"
          _hover={{ bg: 'bg.pagination' }}
          _active={currentPage === totalPages ? {
            bg: 'gradient.pink',
            color: 'white'
          } : { colorScheme: 'white' }}
          isActive
          onClick={() => setCurrentPage(totalPages)}
        >
          {totalPages}
        </Button>
      )}

      {currentPage !== totalPages && (
        <Button
          bg="white"
          _hover={{ bg: 'bg.pagination' }}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          <Text display={{ base: 'none', md: 'block' }}>{t('next')}</Text>
          <ChevronRightIcon pl="0.5rem" boxSize="2rem" />
        </Button>
      )}
    </Box>
  );
}

export default Pagination;