import { isAddress } from "web3-validator";

// Not used yet
export const validateName = (name: string) => {
  const length = name.length;
  return length >= 3 && length <= 64;
};
export const validateSymbol = (name: string) => {
  const length = name.length;
  return length >= 3 && length <= 6;
};
export const validateAddress = (address: string) => {
  return isAddress(address as string);
};

export const validateFiles = (file: File) => {
  if (!(file instanceof File && file?.size > 0)) {
    return "File is required";
  }
  const fsMb = file.size / (1024 * 1024);
  const MAX_FILE_SIZE = 3;
  if (fsMb > MAX_FILE_SIZE) {
    return "Max file size 3mb";
  }
  return true;
};
