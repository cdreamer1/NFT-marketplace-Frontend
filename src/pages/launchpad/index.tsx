'use client'

import React, { ReactElement, useState, useEffect } from 'react'
import {
  Box,
  Flex,
  Text,
  Grid,
  GridItem,
  Center,
  CircularProgress,
  useToast
} from '@chakra-ui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { BsAward } from 'react-icons/bs'
import { useLaunchpadStore, LaunchpadInfo } from '../../../store/useDataStore'
import LaunchpadCard from '@/components/base/Cards/Launchpad'
import Pagination from '@/components/base/Pagination'
import MainLayout from '@/components/layouts/MainLayout'
import { BACKEND_HOST } from '@/constants/env'
import { showError } from '@/utils/exceptionHandler'

const Page = () => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const setLaunchpadList = useLaunchpadStore((state) => state.setLaunchpadList);
  const [launchpad, setLaunchpad] = useState(Array<LaunchpadInfo>);
  const [postsPerPage] = useState(5);
  const [currentPosts, setCurrentPosts] = useState(Array<LaunchpadInfo>);
  const [currentPage, setCurrentPage] = useState(1);

  async function fetchListings() {
    /*Connect database and get launchpad lists for sale. */
    try {
      const launchpadList = await fetch(`${BACKEND_HOST}api/launchpad`, {
        method: "GET",
      });
      const launchpadJson = await launchpadList.json();
      setLaunchpad(launchpadJson);
      setCurrentPage(1);
      setLaunchpadList(launchpadJson);
    } catch (error) {
      showError(error, toast, t);
      console.log(error);
    }
  }

  useEffect(() => {
    setCurrentPosts(launchpad.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1));
  }, [currentPage, launchpad]);

  useEffect(() => {
    (async () => {
      try {
        await fetchListings();
        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [])

  return (
    <>
      <Head>
        <title>Launchpad</title>
        <meta name="description" content="NFT Marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Flex pl="2.5rem" py="1.875rem" bg="bg.header" gap="0.6rem">
        <BsAward size="1.5rem" />
        <Text
          padding="0.125rem 0rem 0rem 0rem"
          fontSize="1.25rem"
          fontWeight={600}
          lineHeight={1}
        >
          {t('launchpad')}
        </Text>
      </Flex>
      {
        loading ?
          <Center position="absolute" top="0" left="0" width="100%" height="100%" backgroundColor="bg.overlay">
            <CircularProgress color="text.pink" isIndeterminate />
          </Center>
          :
          <Box pb={{ base: '2rem', md: '5rem' }}>
            <Box mb="2rem">
              <Grid
                templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
                gap={{ base: 4, md: 10 }}
                p={{ base: 4, md: 10 }}>
                {currentPosts.map((elem, index) => {
                  return <GridItem key={index}>
                    <LaunchpadCard {...elem} onClick={() => { router.push(`/launchpad/collection?addr=${elem.ContractAddress}`) }} />
                  </GridItem>
                })}
              </Grid>
            </Box>
            <Pagination
              totalPosts={launchpad?.length}
              postsPerPage={postsPerPage}
              setCurrentPage={setCurrentPage}
              currentPage={currentPage}
            />
          </Box>
      }
    </>
  );
};

export async function getStaticProps({ locale }: never) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
};

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
};

export default Page;
