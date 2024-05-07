import { defineStyle, defineStyleConfig } from "@chakra-ui/react";

const ghost = defineStyle({
  boxSize: { base: 8, md: 12 },
  minWidth: { base: 8, md: 12 },
});

export const buttonTheme = defineStyleConfig({
  variants: { ghost },
});
