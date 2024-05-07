'use client'

import React, { ChangeEvent, ReactElement, useState, useEffect } from 'react'
import { AddIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Text,
  AspectRatio,
  VStack,
  HStack,
  Center,
  Input,
  Image,
  Textarea,
  Grid,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  IconButton,
  Select,
  CircularProgress,
  useDisclosure
} from '@chakra-ui/react'
import Head from 'next/head'
import { writeContract, waitForTransaction, readContract, fetchBalance } from '@wagmi/core'
import { parseEther } from 'ethers'
import { motion, useAnimation } from 'framer-motion'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useForm } from 'react-hook-form'
import { BsVectorPen, BsImage } from 'react-icons/bs'
import ReactPlayer from 'react-player'
import { createClient, fetchExchange } from 'urql'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import erc1155Json from '@/abis/AlivelandERC1155.json'
import erc721Json from '@/abis/AlivelandERC721.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import AddLevel, { LevelType } from '@/components/base/Modals/AddLevel'
import AddProperty, { PropertyType } from '@/components/base/Modals/AddProperty'
import AddStats, { StatsType } from '@/components/base/Modals/AddStats'
import MainLayout from '@/components/layouts/MainLayout'
import {
  mintFee,
  MaticToken,
  USDTToken,
  WETHToken,
} from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID, SUBGRAPH_URL } from '@/constants/env'
import { ContractType } from '@/lib/types'
import { showError } from '@/utils/exceptionHandler'

type FormValues = {
  nft: File;
  thumbnail: File;
  name: string;
  collection: string;
  quantity: number;
  description: string;
  nftType: string;
  royalty: number;
};

type SelectElementType = {
  label: string;
  value: string;
  is721: boolean;
}

const Page = () => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const { register, setValue, handleSubmit, formState: { errors, isSubmitting }, } = useForm<FormValues>();
  const { address, /*connector, */isConnected } = useAccount();
  const cAddress = address ? checksumAddress(address as Address) : '0x0';
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [collections, setCollections] = useState<Array<SelectElementType>>([]);
  const [collectionAddress, setCollectionAddress] = useState('');
  const { isOpen: isPropertyModalOpen, onOpen: onPropertyModalOpen, onClose: onPropertyModalClose } = useDisclosure();
  const { isOpen: isLevelModalOpen, onOpen: onLevelModalOpen, onClose: onLevelModalClose } = useDisclosure();
  const { isOpen: isStatsModalOpen, onOpen: onStatsModalOpen, onClose: onStatsModalClose } = useDisclosure();
  const [properties, setProperties] = useState<Array<PropertyType>>([]);
  const [levels, setLevels] = useState<Array<LevelType>>([]);
  const [stats, setStats] = useState<Array<StatsType>>([]);
  const [NFTName, setNFTName] = useState<string>('');
  const [NFTDesc, setNFTDesc] = useState<string>('');
  const [imagePath, setImagePath] = useState<string | ArrayBuffer>('');
  const [imageType, setImageType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const controls = useAnimation();
  const startAnimation = () => controls.start("hover");
  const stopAnimation = () => controls.stop();

  const validateFiles = (file: File) => {
    if (!(file instanceof File && file?.size > 0)) {
      return t('file_required');
    }
    const fsMb = file.size / (1024 * 1024);
    const MAX_FILE_SIZE = 3;
    if (fsMb > MAX_FILE_SIZE) {
      return t('max_file_size_3mb')
    }
    return true;
  };
  const { ref } = register('nft', { validate: validateFiles }) as { ref: (instance: HTMLInputElement | null) => void, name: string }

  const validateNFTName = (/*value: string*/) => {
    if (NFTName) {
      if (NFTName.length > 100) {
        return t('name_length_less_100');
      } else if (NFTName.length < 3) {
        return t('name_length_more_3');
      } else {
        return true;
      }
    } else {
      return t('name_required');
    }
  };
  const { ref: refNFTName } = register('name', { validate: validateNFTName });

  const validateNFTDesc = (/*value: string*/) => {
    if (NFTDesc) {
      if (NFTDesc.length > 1000) {
        return t('description_length_less_1000');
      } else if (NFTDesc.length < 10) {
        return t('description_length_more_10');
      } else {
        return true;
      }
    } else {
      return t('description_required');
    }
  };
  const { ref: refNFTDesc } = register('description', { validate: validateNFTDesc });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (file) {
      setImagePath(URL.createObjectURL(file));
      setImageType(file.type);
      setValue('nft', file);
    };
  }

  async function fetchListings(addr: Address) {
    setLoading(true);
    try {
      const listingsQuery = `
        query ListingsQuery {
          contractCreateds(where: {creator: "${addr}"}) {
            id
            creator
            nft
            nftType
          }
        }
      `;

      const urqlClient = createClient({
        url: SUBGRAPH_URL,
        exchanges: [fetchExchange]
      });

      const response = await urqlClient.query(listingsQuery, {}).toPromise();

      if (!response) {
        setLoading(false);
        toast({
          title: t('subgraph_loading_failed'),
          status: 'error',
          isClosable: true,
        });
      }
      const listingEntities: ContractType[] = response.data?.contractCreateds;

      const tempCollections: Array<SelectElementType> = [];
      for (let i = 0; i < listingEntities.length; i++) {
        const name = await readContract({
          address: listingEntities[i].nft,
          abi: listingEntities[i].nftType === 'ERC721' ? erc721Json.abi : erc1155Json.abi,
          functionName: 'name',
        });

        tempCollections.push({ label: name as string, value: listingEntities[i].nft, is721: listingEntities[i].nftType === 'ERC721' });
      }

      if (tempCollections.length === 0) {
        toast({
          title: t('no_collection'),
          status: 'warning',
          isClosable: true,
        });
      }

      setCollections(tempCollections);
    } catch (error) {
      console.log(error);
      toast({
        title: t('data_load_failed'),
        status: 'error',
        isClosable: true,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    async function loadData(address: Address) {
      const balance = await fetchBalance({ address, chainId: CHAIN_ID });
      if (parseFloat(balance.formatted) < 0.01) {
        toast({
          title: t('insufficient_balance'),
          status: 'warning',
          isClosable: true,
        });
      }
    }

    if (isConnected && cAddress !== undefined) {
      loadData(cAddress as Address);
    }
  }, [isConnected, cAddress]);

  useEffect(() => {
    if (isConnected && cAddress) {
      fetchListings(cAddress as Address);
    }
  }, [cAddress, isConnected]);

  const onSubmit = handleSubmit(async (data: FormValues) => {
    if (!isConnected) {
      toast({
        title: t('please_connect_wallet'),
        status: 'warning',
        isClosable: true,
      });
    } else {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.set("nftFile", data.nft);
        // formData.set("nftName", data.name);
        formData.set("nftName", NFTName);
        // formData.set("description", data.description);
        formData.set("description", NFTDesc);
        formData.set("quantity", data.quantity.toString());
        formData.set("nftType", data.nftType);
        formData.set("royalty", data.royalty.toString());
        formData.set("properties", JSON.stringify(properties.filter(prop => prop.type !== '')));
        formData.set("levels", JSON.stringify(levels.filter(prop => prop.type !== '')));
        formData.set("stats", JSON.stringify(stats.filter(prop => prop.type !== '')));

        const filteredCollection = collections.filter(collection => collection.value === collectionAddress);
        filteredCollection[0]?.is721 ? setIsReadOnly(true) : setIsReadOnly(false);

        const uploadResult = await fetch(`${BACKEND_HOST}api/uploadNFT`, {
          method: "POST",
          body: formData,
        });
        if (uploadResult.status != 200) {
          setLoading(false);
          toast({
            title: t('file_upload_failed'),
            status: 'error',
            isClosable: true,
          });
        }

        const resultJSON = await uploadResult.json();
        const ipfsPath = resultJSON.ipfsPath;

        const fee = mintFee * data.quantity;
        const { hash } = await writeContract({
          address: collectionAddress as Address,
          abi: filteredCollection[0].is721 ? erc721Json.abi : erc1155Json.abi,
          functionName: 'mint',
          args: filteredCollection[0].is721 ? [cAddress, ipfsPath, data.royalty, data.name] : [cAddress, data.quantity, ipfsPath, data.name],
          value: parseEther(fee.toString())
        });
        const tx = await waitForTransaction({ hash });

        const logData = tx.logs.find(log => log.topics[0] === '0x824831c138f8435f85483d6084a074f9e20d5a3ca95b5580c2c8b5165b291d58')?.data;
        let beneficiary: `0x${string}` = `0x${logData?.slice(90, 130)}`;
        beneficiary = checksumAddress(beneficiary);

        if (beneficiary === cAddress) {
          toast({
            title: t('nft_minted_successfully'),
            status: 'success',
            isClosable: true,
          });
        } else {
          toast({
            title: t('nft_mint_failed'),
            status: 'error',
            isClosable: true,
          });
        }
      } catch (error) {
        showError(error, toast, t);
        console.log(error);
      }
      setLoading(false);
    }
  });

  return (
    <>
      <Head>
        <title>Create NFT</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <>
        {loading &&
          <Center position="absolute" top="0" left="0" width="100%" height="100%" backgroundColor="bg.overlay" zIndex={1000} >
            <CircularProgress color="text.pink" isIndeterminate />
          </Center>
        }
        <Flex pl="2.5rem" py="1.875rem" bg="bg.header" gap="0.6rem">
          <BsVectorPen size="1.5rem" />
          <Text
            padding="0.125rem 0rem 0rem 0rem"
            fontSize="1.25rem"
            fontWeight={600}
            lineHeight={1}
          >
            {t('create_nft')}
          </Text>
        </Flex>
        <form onSubmit={onSubmit}>
          <Box
            px={{ base: '1rem', md: '2.5rem' }}
            pt={{ base: '1.5rem', lg: '3.9rem' }}
            fontSize="1.125rem"
            mb={{ base: '2rem', lg: '5rem', xl: '6.25rem' }}
            color="text.dark"
          >
            <Grid
              templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
              gap={{ base: '1rem', md: '2.9375rem' }}
            >
              <Box w="100%" borderRadius="xl" overflow="hidden">
                <FormControl
                  isInvalid={!!errors?.nft?.message}
                >
                  <AspectRatio
                    ratio={4 / 3}
                    bg="bg.card"
                    borderRadius="xl"
                    boxShadow="2px 2px 9px 0px #00000040"
                    bgRepeat="no-repeat"
                    bgSize="cover"
                    role="group"
                    transition="all 150ms ease-in-out"
                    _hover={{
                      shadow: "md"
                    }}
                    as={motion.div}
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                  >
                    <Box position="relative" width="100%" height="100%">
                      {
                        imagePath
                          ? imageType.substring(0, 5) == 'video' ?
                            <ReactPlayer url={imagePath.toString()} width="100%" height="100%" controls={true} />
                            : <Image src={imagePath.toString()} objectFit="cover" width="100%" height="100%" alt="Image" />
                          : <VStack
                            position="absolute"
                          >
                            <Center>
                              <BsImage size="40%" color="white" />
                            </Center>
                            <VStack spacing={0} color="white" fontWeight={500} fontSize="0.875rem" lineHeight={1}>
                              <Text>{t('drag_drop')}</Text>
                              <Text>{t('or')}</Text>
                              <Text>{t('select_media')}</Text>
                            </VStack>
                          </VStack>
                      }
                    </Box>
                  </AspectRatio>
                  <FormErrorMessage>{errors?.nft?.message}</FormErrorMessage>
                  <Text mt="1.75rem" mb="1.25rem">{t('thumbnail')}</Text>
                  <AspectRatio width="15%" ratio={1}>
                    <Box
                      borderColor="text.gray"
                      borderStyle="dashed"
                      borderWidth="2px"
                      shadow="sm"
                      role="group"
                      transition="all 150ms ease-in-out"
                      _hover={{
                        shadow: "md"
                      }}
                    >
                      <Box position="relative" height="100%" width="100%">
                        <Center
                          height="100%"
                          width="100%"
                        >
                          <AddIcon boxSize={6} color="text.gray" />
                        </Center>
                        <Input
                          id="nft"
                          type="file"
                          height="100%"
                          width="100%"
                          position="absolute"
                          top="0"
                          left="0"
                          opacity="0"
                          aria-hidden="true"
                          accept="audio/*|video/*|image/*|png"
                          ref={(e) => {
                            ref(e)
                          }}
                          // {...register('nft', { validate: validateFiles })}
                          onChange={handleFileChange}
                          onDragEnter={startAnimation}
                          onDragLeave={stopAnimation}
                        />
                      </Box>
                    </Box>
                  </AspectRatio>
                </FormControl>
              </Box>
              <Box>
                <Box padding={0} color="text.black" mb="1.5625rem">
                  <FormControl
                    isInvalid={!!errors?.name?.message}
                    isRequired
                  >
                    <HStack mb="0.75rem" justify="space-between">
                      <FormLabel mb="0" lineHeight={1} fontSize="1.125rem" fontWeight={500}>{t('nft_name')}</FormLabel>
                      <Text fontSize="1rem" lineHeight={1} fontWeight={300}>{NFTName?.length}/100</Text>
                    </HStack>
                    <Input
                      id="name"
                      width="100%"
                      height="3rem"
                      padding="0rem 1rem"
                      borderRadius="base"
                      borderColor="text.dark"
                      borderWidth="1px"
                      onChange={(e) => setNFTName(e.target.value)}
                      value={NFTName}
                      // {...register('name', {
                      //   required: 'NFT name is required',
                      //   minLength: { value: 3, message: t('minimum_length_should_be_3') },
                      //   maxLength: { value: 100, message: t('maximum_length_should_be_1000') }
                      // })}
                      ref={(e) => {
                        refNFTName(e)
                      }}
                    />
                    <FormErrorMessage>{errors?.name && errors?.name?.message}</FormErrorMessage>
                  </FormControl>
                </Box>
                <Box padding={0} color="text.black" mb="1.875rem">
                  <FormControl
                    isInvalid={!!errors?.collection?.message}
                    isRequired
                  >
                    <FormLabel mb="0.75rem" fontSize="1.125rem" lineHeight={1} fontWeight={500}>{t('collection_name')}</FormLabel>
                    <Select
                      id="collection"
                      placeholder=" "
                      width="100%"
                      height="3rem"
                      borderRadius="base"
                      borderColor="text.dark"
                      borderWidth="1px"
                      onChange={(e) => {
                        if (!e.target.value || e.target.value.length === 0) return;
                        setCollectionAddress(e.target.value);
                        const filteredCollection = collections.filter(collection => collection.value === e.target.value);
                        filteredCollection[0].is721 ? setIsReadOnly(true) : setIsReadOnly(false);
                      }}
                    >
                      {
                        collections.map(
                          (collection, index) =>
                            <option key={index} value={collection.value}>
                              {collection.label}
                            </option>
                        )
                      }
                    </Select>
                    <FormErrorMessage>{errors?.name && errors?.name?.message}</FormErrorMessage>
                  </FormControl>
                </Box>
                <Box padding={0} color="text.black" mb="1.875rem">
                  <VStack gap="0.75rem">
                    <HStack width="100%" justify="space-between">
                      <Box>
                        <Text color="text.navy" fontSize="1rem" fontWeight={800} lineHeight={1} mb="0.375rem">{t('properties')}</Text>
                        <Text color="text.dark" fontSize="0.75rem" fontWeight={400} lineHeight={1} textAlign="justify">{t('properties_desc')}</Text>
                      </Box>
                      <IconButton
                        bg="white" color="text.gray" borderColor="text.gray" variant='outline' aria-label='Add properties' icon={<AddIcon />}
                        onClick={onPropertyModalOpen} />
                    </HStack>
                    <HStack width="100%" justify="space-between">
                      <Box>
                        <Text color="text.navy" fontSize="1rem" fontWeight={800} lineHeight={1} mb="0.375rem">{t('levels')}</Text>
                        <Text color="text.dark" fontSize="0.75rem" fontWeight={400} lineHeight={1} textAlign="justify">{t('levels_desc')}</Text>
                      </Box>
                      <IconButton bg="white" color="text.gray" borderColor="text.gray" variant='outline' aria-label='Add levels' icon={<AddIcon />}
                        onClick={onLevelModalOpen} />
                    </HStack>
                    <HStack width="100%" justify="space-between">
                      <Box>
                        <Text color="text.navy" fontSize="1rem" fontWeight={800} lineHeight={1} mb="0.375rem">{t('stats')}</Text>
                        <Text color="text.dark" fontSize="0.75rem" fontWeight={400} lineHeight={1} textAlign="justify">{t('stats_desc')}</Text>
                      </Box>
                      <IconButton bg="white" color="text.gray" borderColor="text.gray" variant='outline' aria-label='Add stats' icon={<AddIcon />}
                        onClick={onStatsModalOpen} />
                    </HStack>
                  </VStack>
                </Box>
                <Box padding={0} color="text.black" mb="1.875rem">
                  <FormControl
                    isRequired>
                    <FormLabel mb="0.75rem" fontSize="1.125rem" lineHeight={1} fontWeight={500}>{t('quantity')}</FormLabel>
                    <Input
                      id="quantity"
                      isReadOnly={isReadOnly}
                      width="100%"
                      height="3rem"
                      padding="0rem 1rem"
                      borderRadius="base"
                      borderColor="text.dark"
                      borderWidth="1px"
                      defaultValue={'1'}
                      {...register('quantity', {
                        required: 'NFT quantity is required',
                        min: { value: 0, message: t('minimum_value_should_be_0') }
                      })}
                    />
                  </FormControl>
                </Box>
                <Box padding={0} color="text.black" mb="1.875rem">
                  <FormControl
                    isInvalid={!!errors?.description?.message}
                    isRequired
                  >
                    <HStack mb="0.75rem" justify="space-between">
                      <FormLabel mb="0" lineHeight={1} fontSize="1.125rem" fontWeight={500}>{t('nft_description')}</FormLabel>
                      <Text fontSize="1rem" lineHeight={1} fontWeight={300}>{NFTDesc?.length}/1000</Text>
                    </HStack>
                    <Textarea
                      id="description"
                      width="100%"
                      height="13.75rem"
                      placeholder={t('type_something')}
                      borderRadius="base"
                      borderColor="text.dark"
                      borderWidth="1px"
                      padding="1.25rem 1rem"
                      fontSize="0.875rem"
                      gap="0.5rem"
                      onChange={(e) => setNFTDesc(e.target.value)}
                      value={NFTDesc}
                      // {...register('description', {
                      //   maxLength: { value: 1000, message: t('maximum_length_should_be_1000') }
                      // })}
                      ref={(e) => {
                        refNFTDesc(e)
                      }}
                    />
                    <FormErrorMessage>{errors?.description && errors?.description?.message}</FormErrorMessage>
                  </FormControl>
                </Box>
                <Box padding="1.25rem" color="text.black" bg="bg.header" mb="1.875rem">
                  <Text mb="0.75rem" lineHeight={1} fontWeight={500}>{t('network')}</Text>
                  <Select bg="white" placeholder="Polygon" color="text.gray" mb="1.25rem" />
                  <Text mb="0.75rem" lineHeight={1} fontWeight={500}>{t('base_price')}</Text>
                  <Select bg="white" defaultValue={MaticToken[CHAIN_ID]}color="text.dark" fontWeight={600}>
                    <option value={MaticToken[CHAIN_ID]}>MATIC</option>
                    <option value={USDTToken[CHAIN_ID]}>USDT</option>
                    <option value={WETHToken[CHAIN_ID]}>WETH</option>
                  </Select>
                </Box>
                <Box padding="1.25rem" color="text.black" bg="bg.header">
                  <Text mb="1.25rem" fontSize="1.125rem" lineHeight={1} fontWeight={600}>{t('filters')}</Text>
                  <FormControl>
                    <FormLabel mb="0.75rem" fontSize="1.125rem" lineHeight={1} fontWeight={500}>{t('nft_types')}</FormLabel>
                    <Select
                      id="nftType"
                      mb="1.25rem"
                      bg="white"
                      color="text.gray"
                      {...register('nftType', {})}
                    >
                      <option value="art">{t('art')}</option>
                      <option value="image">{t('image')}</option>
                      <option value="gif">{t('gif')}</option>
                      <option value="video">{t('video')}</option>
                      <option value="music">{t('music')}</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel mb="0.75rem" fontSize="1.125rem" lineHeight={1} fontWeight={500}>{t('royalty')}</FormLabel>
                    <Select
                      id="royalty"
                      mb="0.75rem"
                      bg="white"
                      color="text.dark"
                      fontWeight={600}
                      {...register('royalty', {})}
                    >
                      <option value="250">2.5%</option>
                      <option value="500">5%</option>
                      <option value="750">7.5%</option>
                      <option value="1000">10%</option>
                    </Select>
                    <Text fontSize="0.875rem" lineHeight={1} color="text.gray" fontWeight={400} textAlign="end">{t('royalty_desc')}</Text>
                  </FormControl>
                </Box>
              </Box>
            </Grid>
          </Box>
          <Center px={{ base: '1rem', md: '2.5rem' }} mb={{ base: '2rem', lg: '5rem', xl: '6.25rem' }}>
            <Grid
              templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
              gap="1.25rem"
              h={{ base: '8.25rem', lg: '3.5rem' }}
              w={{ base: '100%', lg: '36.25rem' }}
            >
              <PinkButton
                isLoading={isSubmitting}
                fontSize="1.25rem"
                borderWidth="0.1875rem"
                type="submit"
              >
                {t('create')}
              </PinkButton>
              <PinkButton
                isLoading={false}
                fontSize="1.25rem"
                borderWidth="0.1875rem"
                onClick={() => { }}
              >
                {t('cancel')}
              </PinkButton>
            </Grid>
          </Center>
          <AddProperty onModalClose={onPropertyModalClose} isModalOpen={isPropertyModalOpen} properties={properties} setProperties={setProperties} />
          <AddLevel onModalClose={onLevelModalClose} isModalOpen={isLevelModalOpen} levels={levels} setLevels={setLevels} />
          <AddStats onModalClose={onStatsModalClose} isModalOpen={isStatsModalOpen} stats={stats} setStats={setStats} />
        </form>
      </>
    </>
  )
}

export async function getStaticProps({ locale }: never) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default Page;
