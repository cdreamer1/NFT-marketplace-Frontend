import { ReactNode } from 'react'
import {
  Button,
  Box,
} from '@chakra-ui/react'

interface Props {
  disabled?: boolean;
  children?: ReactNode;
  isLoading?: boolean;
  fontSize: string;
  lineHeight?: string;
  borderWidth?: string;
  onClick?: () => void;
  type?: string;
};

const PinkButton = (props: Props) => {
  return (
    <Box
      w="100%"
      h="100%"
      borderRadius="full"
      bg="gradient.pink"
      p={props.borderWidth}
    >
      <Button
        w="100%"
        h="100%"
        bg="white"
        color="text.dark"
        isDisabled={props.disabled}
        fontSize={props.fontSize}
        fontWeight={700}
        lineHeight={props.lineHeight}
        borderRadius="full"
        border="none"
        isLoading={props.isLoading}
        loadingText={props.children}
        spinnerPlacement="start"
        _hover={{
          bg: 'gradient.pink',
          color: 'white'
        }}
        onClick={props.onClick}
        type={props.type == 'submit' ? 'submit' : 'button'}
      >
        {props.children}
      </Button>
    </Box>
  );
}

export default PinkButton;