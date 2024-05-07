import { AspectRatio, Box, Flex, VStack, Text, Image } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import { staticPath } from '@/lib/$path'

interface Props {
  name: string,
  creator: string,
  amount: string,
  banner: string,
  icon: string,
  onClick: () => void
};

export default function RecommendedCard(info: Props) {
  const { t } = useTranslation('common');

  return (
    <Box w="100%" borderRadius="xl" overflow="hidden" boxShadow="2px 2px 9px 0px #00000040" onClick={info.onClick} _hover={{ cursor: 'pointer' }}>
      <AspectRatio ratio={4 / 3} bgImage={info.banner} bgRepeat="no-repeat" bgSize="cover">
        <></>
      </AspectRatio>
      <Box px={2.5} pt={6} pb={5} position="relative">
        <VStack spacing={3} align="stretch" fontSize="xs" color="text.black">
          <Flex justifyContent="flex-end">
            <Text color="text.green">by {info.creator}</Text>
          </Flex>
          <Flex justifyContent="flex-end">
            <Text fontSize="sm" fontWeight={600}>{info.name}</Text>
          </Flex>
          <Flex justifyContent="space-between">
            <Image
              src={staticPath.polygon_icon_svg}
              alt="Photo"
              overflow="hidden"
              borderRadius="full"
              boxSize={5} />
            <Text>
              {info.amount} {t('items')}
            </Text>
          </Flex>
        </VStack>
        <Image
          src={info.icon}
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


