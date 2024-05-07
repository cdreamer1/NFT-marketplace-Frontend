'use client'

import React, { ReactElement, useEffect, useState } from 'react'
import {
  Box,
  Flex,
  Stack,
  Text,
  Button,
  HStack,
  Center,
  Input,
  Textarea,
  Grid,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Radio,
  RadioGroup,
  useClipboard,
  CircularProgress
} from '@chakra-ui/react'
import Head from 'next/head'
import {
  writeContract,
  readContract,
  waitForTransaction,
  fetchBalance
} from '@wagmi/core'
import { parseEther } from 'ethers'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useForm } from 'react-hook-form'
import { BsVectorPen } from 'react-icons/bs'
import { Address, checksumAddress } from 'viem'
import { useAccount } from 'wagmi'
import factory1155Json from '@/abis/AlivelandERC1155Factory.json'
import factory721Json from '@/abis/AlivelandERC721Factory.json'
import proxyAdminJson from '@/abis/ProxyAdmin.json'
import PinkButton from '@/components/base/Buttons/PinkButton'
import FileUpload from '@/components/base/FileUpload'
import MainLayout from '@/components/layouts/MainLayout'
import {
  Factory721ProxyContract,
  Factory1155ProxyContract,
  proxyAdminContract,
  price
} from '@/constants/data'
import { BACKEND_HOST, CHAIN_ID } from '@/constants/env'
import { showError } from '@/utils/exceptionHandler'

type FormValues = {
  bannerFile: File;
  iconFile: File;
  name: string;
  symbol: string;
  description: string;
};

const Page = () => {
  const toast = useToast();
  const [radioValue, setRadioValue] = useState('1');
  const { address,/* connector,*/ isConnected } = useAccount();
  const cAddress = address ? checksumAddress(address as Address) : '0x0';
  const { onCopy, value, setValue: setClipboardValue, hasCopied } = useClipboard('');
  const { register, setValue, handleSubmit, formState: { errors, isSubmitting }, } = useForm<FormValues>();

  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);

  const validateFiles = (file: File) => {
    if (!(file instanceof File && file?.size > 0)) {
      return t('file_required');
    }
    const fsMb = file.size / (1024 * 1024);
    const MAX_FILE_SIZE = 3;
    if (fsMb > MAX_FILE_SIZE) {
      return t('max_file_size_3mb');
    }
    return true;
  };

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
        formData.set("bannerFile", data.bannerFile);
        formData.set("iconFile", data.iconFile);
        formData.set("name", data.name);
        formData.set("symbol", data.symbol);
        formData.set("description", data.description);

        const uploadResult = await fetch(`${BACKEND_HOST}api/uploadCollection`, {
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
        const resultJson = await uploadResult.json();
        const ipfsPath = resultJson.ipfsPath;
        const metadataUrl = `https://ipfs.io/ipfs/${ipfsPath}`;

        const factoryAddress = await readContract({
          address: proxyAdminContract[CHAIN_ID],
          abi: proxyAdminJson.abi,
          functionName: 'getProxyImplementation',
          args: radioValue === '1' ? [Factory721ProxyContract[CHAIN_ID]] : [Factory1155ProxyContract[CHAIN_ID]],
        });

        const { hash } = await writeContract({
          address: factoryAddress as Address,
          abi: radioValue == '1' ? factory721Json.abi : factory1155Json.abi,
          functionName: 'createNFTContract',
          args: [data.name, data.symbol, metadataUrl],
          value: parseEther(price.toString())
        });
        const tx = await waitForTransaction({ hash });

        const logData = tx.logs.find(log => log.topics[0] === '0xd127e714d98e23e914e6659df0aa28a12758da7c47219dbcc981d617de644b13')?.data;
        let nftCollection: `0x${string}` = `0x${logData?.slice(90, 130)}`;
        nftCollection = checksumAddress(nftCollection);
        setClipboardValue(nftCollection);

        toast({
          title: t('collection_created_successfully'),
          status: 'success',
          isClosable: true,
        });
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
        <title>Create Collection</title>
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
            {t('create_collection')}
          </Text>
        </Flex>
        <form onSubmit={onSubmit}>
          <Box
            px={{ base: '1rem', md: '2.5rem' }}
            pt={{ base: '1.5rem', lg: '3.9rem' }}
            mb={{ base: '1rem', lg: '1.875rem' }}
            color="text.dark">
            <Grid
              templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
              gap="1.6rem"
            >
              <Box padding={0} color="text.black">
                <FormControl
                  isInvalid={!!errors?.name?.message}
                  isRequired
                >
                  <FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={500}>{t('collection_name')}</FormLabel>
                  <Input
                    id="name"
                    width="100%"
                    height="3rem"
                    padding="0rem 1rem"
                    borderRadius="base"
                    borderColor="text.dark"
                    borderWidth="1px"
                    {...register('name', {
                      required: 'Collection name is required',
                      minLength: { value: 3, message: 'Minimum length should be 3' },
                      maxLength: { value: 100, message: 'Maximum length should be 100' }
                    })}
                  />
                  <FormErrorMessage>{errors?.name && errors?.name?.message}</FormErrorMessage>
                </FormControl>
              </Box>
              <Box>
                <FormControl
                  isInvalid={!!errors?.symbol?.message}
                  isRequired
                >
                  <FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={500}>{t('collection_symbol')}</FormLabel>
                  <Input
                    id="symbol"
                    width="100%"
                    height="3rem"
                    padding="0rem 1rem"
                    borderRadius="base"
                    borderColor="text.dark"
                    borderWidth="1px"
                    {...register('symbol', {
                      required: 'Collection symbol is required',
                      minLength: { value: 3, message: 'Minimum length should be 3' },
                      maxLength: { value: 6, message: 'Maximum length should be 6' }
                    })}
                  />
                  <FormErrorMessage>{errors?.symbol && errors?.symbol?.message}</FormErrorMessage>
                </FormControl>
              </Box>
            </Grid>
          </Box>
          <Box
            px={{ base: '1rem', md: '2.5rem' }}
            fontSize="1.125rem"
            mb={{ base: '1rem', lg: '1.875rem' }}
            color="text.dark"
          >
            <FormControl
              isInvalid={!!errors?.description?.message}
            >
              <FormLabel mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={500}>{t('collection_description')}</FormLabel>
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
                {...register('description', {
                  maxLength: { value: 100, message: 'Maximum length should be 100' }
                })}
              />
              <FormErrorMessage>{errors?.description?.message}</FormErrorMessage>
            </FormControl>
          </Box>
          <Box
            px={{ base: '1rem', md: '2.5rem' }}
            fontSize="1.125rem"
            mb={{ base: '1rem', lg: '1.875rem' }}
            color="text.dark"
          >
            <Text mb="0.75rem" lineHeight={1} fontSize="1.125rem" fontWeight={500}>{t('contract_address')}</Text>
            <HStack gap="1.4375rem">
              <Input
                width="100%"
                height="3rem"
                padding="0rem 1rem"
                borderRadius="base"
                borderColor="text.dark"
                borderWidth="1px"
                value={value}
                disabled
              />
              <Button
                bg="text.green"
                w="10.125rem"
                h="3rem"
                color="white"
                onClick={onCopy}
              >
                {hasCopied ? t('copied') : t('copy')}
              </Button>
            </HStack>
          </Box>
          <RadioGroup
            onChange={setRadioValue}
            value={radioValue}
            px={{ base: '1rem', md: '2.5rem' }}
            mb={{ base: '1rem', lg: '1.875rem' }}
            color="text.dark"
            colorScheme="pink"
            fontWeight={500}
            size="lg"
          >
            <Stack gap="0.625rem">
              <Radio value="1">ERC 721</Radio>
              <Radio value="2">ERC 1155</Radio>
            </Stack>
          </RadioGroup>
          <Box px={{ base: '1rem', md: '2.5rem' }}>
            <Center mb={{ base: '2rem', lg: '4rem', xl: '6.25rem' }}>
              <Grid
                w="100%"
                templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}
                gap={{ base: '2rem', lg: '3rem', xl: '5rem' }}
              >
                <Box p={0} w={{ base: '100%' }}>
                  <FormControl
                    isInvalid={!!errors?.bannerFile?.message}
                  >
                    <Box id="bannerFile">
                      <FileUpload
                        accept={'image/*'}
                        register={register('bannerFile', { validate: validateFiles })}
                        // {...register('bannerFile', {
                        //   required: 'Banner image is required',
                        // })}
                        caption={t('banner')}
                        setValue={setValue}
                      />
                    </Box>
                    <FormErrorMessage>{errors?.bannerFile?.message}</FormErrorMessage>
                  </FormControl>
                </Box>
                <Box p={0} w={{ base: '100%' }}>
                  <FormControl
                    isInvalid={!!errors?.iconFile?.message}
                  >
                    <Box id="iconFile">
                      <FileUpload
                        accept={'image/*'}
                        register={register('iconFile', { validate: validateFiles })}
                        caption={t('icon')}
                        setValue={setValue}
                      />
                    </Box>
                    <FormErrorMessage>{errors?.iconFile?.message}</FormErrorMessage>
                  </FormControl>
                </Box>
              </Grid>
            </Center>
          </Box>
          <Center px={{ base: '1rem', md: '2.5rem' }} mb={{ base: '2rem', lg: '5rem', xl: '8.125rem' }}>
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
