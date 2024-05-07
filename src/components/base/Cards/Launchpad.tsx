import { AspectRatio, Box, Flex, VStack, Text, Image, HStack } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import { staticPath } from '@/lib/$path'

interface Props {
  ContractAddress: string,
  Name: string,
  Seller: string,
  Amount: string,
  IsCompleted: boolean,
  BannerImage: string,
  IconImage: string,
  onClick: () => void,
};

export default function LaunchpadCard(info: Props) {
  const { t } = useTranslation('common');

  return (
    <Box w="100%" borderRadius="xl" overflow="hidden" boxShadow="2px 2px 9px 0px #00000040" onClick={info.onClick} _hover={{ cursor: 'pointer' }}>
      <AspectRatio ratio={4 / 3} bgImage={info.BannerImage} bgRepeat="no-repeat" bgSize="cover">
        <></>
      </AspectRatio>
      <Box px={2.5} pt={6} pb={5} position="relative">
        <VStack spacing={3} align="stretch" fontSize="xs">
          <Flex justifyContent="flex-end">
            <Text color="text.green">by {info.Seller}</Text>
          </Flex>
          <Flex justifyContent="flex-end" color="text.black">
            <Text fontSize="sm" color="text.black" fontWeight={600}>{info.Name}</Text>
          </Flex>
          <Flex justifyContent="space-between">
            <HStack spacing={1}>
              <Image
                src={staticPath.polygon_icon_svg}
                alt="Photo"
                overflow="hidden"
                borderRadius="full"
                boxSize={5} />
              <Text>
                {info.Amount} {t('items')}
              </Text>
            </HStack>
            <Text color="text.pink" fontSize="xs" bgClip="text" bgGradient="linear(90deg, #9700CC 2.21%, #C200E1 100.22%)">
              {info.IsCompleted ? 'Completed' : ''}
            </Text>
          </Flex>
        </VStack>
        <Image
          src={info.IconImage}
          alt="Photo"
          overflow="hidden"
          borderRadius="full"
          boxSize="3.75rem"
          position="absolute"
          top="-2rem"
          left={2.5} />
      </Box>
    </Box>
  );
}


