import { extendTheme } from "@chakra-ui/react";
import { Roboto, Noto_Sans_JP } from "next/font/google";
import { buttonTheme } from "@/components/theme/button";
import { modalTheme } from "@/components/theme/modal";

const robotoFont = Roboto({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
});

const notosansFont = Noto_Sans_JP({
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
});

const customTheme = extendTheme({
  initialColorMode: "dark",
  useSystemColorMode: false,
  fonts: {
    body: `${robotoFont.style.fontFamily}, ${notosansFont.style.fontFamily}`,
    heading: `${robotoFont.style.fontFamily}, ${notosansFont.style.fontFamily}`,
  },
  colors: {
    gradient: {
      pink: "linear-gradient(90deg, #9700CC 2.21%, #C200E1 100.22%)",
    },
    bg: {
      header: "#F2F4F8",
      card: "#D9D9D9",
      pagination: "#EBEDF0",
      overlay: "#00000060",
    },
    search: "#697077",
    text: {
      green: "#5FCEA9",
      black: "#21272A",
      pink: "#9700CC",
      blue: "#0037CC",
      dark: "#404040",
      tab: "#4779FF",
      navy: "#001D6C",
      gray: "#808080",
    },
  },
  sizes: {
    18: "4.5rem",
  },
  components: {
    Drawer: {
      parts: ["dialog", "header", "body"],
      variants: {
        primary: {
          secondary: {
            dialog: {
              maxW: "16rem",
            },
          },
        },
      },
    },
    Modal: modalTheme,
    Link: {
      baseStyle: {
        _hover: {
          textDecoration: "none",
          color: "gray.400",
        },
      },
    },
    Button: buttonTheme,
  },
});

export default customTheme;
