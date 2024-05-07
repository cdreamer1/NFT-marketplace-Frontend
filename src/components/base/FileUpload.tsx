import { ChangeEvent, ReactNode, useRef, useState } from 'react'
import {
  Heading,
  Text,
  AspectRatio,
  Box,
  InputGroup,
  Flex,
  Button,
  Spacer,
  Image
} from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import { UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form'
import { BsImage } from 'react-icons/bs'

type FormValues = {
  bannerFile: File;
  iconFile: File;
  name: string;
  symbol: string;
  description: string;
};

type FileUploadProps = {
  register: UseFormRegisterReturn
  accept?: string
  multiple?: boolean
  children?: ReactNode
  caption: string,
  setValue: UseFormSetValue<FormValues>
}

interface Props {
  title: string,
  desc: string
}

function Feature(info: Props) {
  return (
    <Box>
      <Heading fontWeight={600} fontSize="1.25rem" lineHeight={1} color="black">{info.title}</Heading>
      <Text mt={3} fontWeight={400} fontSize="0.875rem" lineHeight={1} color="text.dark" letterSpacing="0.5px">{info.desc}</Text>
    </Box>
  )
}

const FileUpload = (props: FileUploadProps) => {
  const { t } = useTranslation('common');

  const { register, accept, multiple, children, caption, setValue } = props
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imagePath, setImagePath] = useState<string | ArrayBuffer>('');
  const { ref, ...rest } = register as { ref: (instance: HTMLInputElement | null) => void, name: string }

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];

    if (file) {
      setImagePath(URL.createObjectURL(file));
      setValue((rest?.name as keyof FormValues) || caption, file);
    };
  }

  return (
    <Box w="100%" borderRadius="xl" overflow="hidden" boxShadow="2px 2px 9px 0px #00000040">
      <AspectRatio ratio={2 / 1} bg="bg.card" bgRepeat="no-repeat" bgSize="cover">
        <Box>
          {
            imagePath
              ? <Image src={imagePath.toString()} objectFit="cover" width="100%" height="100%" alt="Image" />
              : <BsImage size="50%" color="white" />
          }
        </Box>
      </AspectRatio>
      <Box px={{ base: 3, md: 4, xl: '1.875rem' }} pt={{ base: 3, lg: 5, xl: 9 }} pb={{ base: 3, lg: 5, xl: 10 }} position="relative">
        <Flex w="100%">
          <Feature
            title={caption}
            desc={t('image_size') + ' 1184*280'}
          />
          <Spacer />
          <Button bg="text.green" minW={{ base: '0', xl: '10.125rem' }} h="3rem" color="white" px="2rem" py="0.875rem" onClick={handleClick}>
            {t('upload')}
          </Button>
        </Flex>
        <InputGroup onClick={handleClick}>
          <input
            type="file"
            multiple={multiple || false}
            hidden
            accept={accept}
            {...rest}
            onChange={handleFileChange}
            ref={(e) => {
              ref(e)
              inputRef.current = e
            }}
          />
          <>
            {children}
          </>
        </InputGroup>
      </Box>
    </Box>
  )
}

export default FileUpload;