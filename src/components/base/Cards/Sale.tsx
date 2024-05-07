import { AspectRatio, Box, VStack, Text, HStack, IconButton } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import {
  BsSuitHeart
} from 'react-icons/bs'
import { staticPath } from '@/lib/$path'

interface Props {
  name: string,
  price: number,
  amount: number,
  mainImage: string,
  isSale: boolean,
  onClick: () => void
};

export default function SaleCard(info: Props) {
  const { t } = useTranslation('common');

  return (
    <Box w="100%" borderRadius="xl" overflow="hidden" boxShadow="2px 2px 9px 0px #00000040" onClick={info.onClick} _hover={{ cursor: 'pointer' }}>
      <AspectRatio ratio={4 / 3} bgImage={info.mainImage} bgRepeat="no-repeat" bgSize="cover" position="relative">
        <Box>
          <IconButton
            position="absolute"
            right={3.5}
            bottom={3.5}
            fontSize="1.375rem"
            boxSize="1.375rem"
            minWidth={6}
            w={6}
            h={6}
            variant="ghost"
            aria-label="like"
            color="black"
            _hover={{ color: 'whiteAlpha.500' }}
            icon={<BsSuitHeart />}
          />
        </Box>
      </AspectRatio>
      <Box px={4} pt={3.5} pb={6} position="relative">
        <VStack spacing={1.5} align="center" fontSize="sm" fontWeight={600}>
          <HStack spacing={1}>
            <Text color="text.black">{info.name}</Text>
          </HStack>
          <HStack spacing={1}>
            <Text color={info.isSale ? 'text.blue' : 'transparent'} fontSize="xs">{t('onsale')}</Text>
          </HStack>
          <HStack color={info.isSale ? 'text.black' : 'transparent'} spacing={1}>
            <Text fontSize="xs">{t('floor_price')} :</Text>
            <Text
              bgImage={info.isSale ? staticPath.polygon_icon_svg : ''}
              bgRepeat="no-repeat"
              pl={5}
              pr={1}
            >
              {info.price}
            </Text>
          </HStack>
          <HStack spacing={1}>
            <Text fontSize="xs">{t('total_number')} :</Text>
            <Text fontSize="xs">{info.amount}</Text>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}