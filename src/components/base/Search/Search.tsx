'use client'

import { ChangeEvent, useState } from 'react'
import {
  Box, Flex, FlexProps, Icon, IconButton, Input, InputGroup, InputLeftElement,
  ListProps, Modal, ModalBody, ModalContent, ModalOverlay, Link, TableContainer, Table, Thead, Tr, Td, Tbody, Th
} from '@chakra-ui/react'
import { HiMiniMagnifyingGlass } from 'react-icons/hi2'
import { createClient, fetchExchange } from 'urql'
import { Address } from 'viem'
import { SUBGRAPH_URL } from '@/constants/env'

interface SearchProps extends FlexProps {
  onSearchClose: () => void,
  onSearchOpen: () => void,
  isSearchOpen: boolean
};

interface Props extends ListProps {
  isOpen: boolean,
  setOpen: (val: boolean) => void
};

type CollectionType = {
  name: string;
  nft: Address;
  nftType: string;
};

async function fetchCollectionsWithQuery(query: string) {
  const collectionsQuery = `
		query CollectionsQuery {
			contractCreateds(where: {name_contains_nocase: "${query}"}) {
        nft
        name
        nftType
      }
		}
	`;

  const urqlClient = createClient({
    url: SUBGRAPH_URL,
    exchanges: [fetchExchange]
  });

  const response = await urqlClient.query(collectionsQuery, {}).toPromise();
  const collections: CollectionType[] = response.data.contractCreateds;

  return collections;
}

const InputAndList = ({ isOpen, setOpen }: Props) => {
  const [collectionList, setCollectionList] = useState<CollectionType[]>([]);

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    if (query.length > 2) {
      const result = await fetchCollectionsWithQuery(query);
      setCollectionList(result);
    } else {
      setCollectionList([]);
    }
  }

  return (
    <InputGroup size="md" width={{ base: '100%', md: '84%' }} zIndex={1000}>
      <InputLeftElement pointerEvents="none">
        <Icon
          ml={0}
          fontSize="1.2rem"
          color="search"
          _groupHover={{
            color: 'black',
          }}
          as={HiMiniMagnifyingGlass}
        />
      </InputLeftElement>
      <Input
        type="text" pl={8} bg={'white'} placeholder="Search" borderRadius="full"
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => {
          setOpen(false)
        }, 200)} />
      {isOpen &&
        <TableContainer position="absolute" top="40px" bgColor="bg.header" zIndex={1000} width="100%" mt={1}>
          <Table>
            <Thead>
              <Tr color="text.dark">
                <Th>
                  Collections
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {collectionList.length > 0 ? (
                collectionList.map((elem, index) => (
                  <Tr key={index} p={1}>
                    <Td p={1}>
                      <Link display="block" href={`/collection?addr=${elem.nft}`} p={2}>
                        {elem.name}
                      </Link>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr p={1}>
                  <Td p={2} pl={3} color="text.gray">No matching result found</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>}
    </InputGroup>)
}

const Search = ({ onSearchClose, onSearchOpen, isSearchOpen }: SearchProps) => {
  const [isOpen, setOpen] = useState(false);

  return (
    <Box position="relative" width="100%">
      <Box display={{ base: 'none', md: 'block' }}>
        <InputAndList isOpen={isOpen} setOpen={setOpen} />
      </Box>
      <Flex justifyContent="center" display={{ base: 'block', md: 'none' }} textAlign="center">
        <IconButton
          onClick={onSearchOpen}
          fontSize={{ base: '1.5rem', md: '3xl' }}
          boxSize={{ base: 8, md: 12 }}
          minWidth={{ base: 8, md: 12 }}
          variant="ghost"
          aria-label="connect wallet"
          color="white"
          _hover={{ color: 'whiteAlpha.500' }}
          icon={<HiMiniMagnifyingGlass />} />
      </Flex>
      <Modal onClose={onSearchClose} size={'lg'} isOpen={isSearchOpen} >
        <ModalOverlay />
        <ModalContent borderRadius="md" m={2}>
          <ModalBody p={2}>
            <InputAndList isOpen={isOpen} setOpen={setOpen} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Search;