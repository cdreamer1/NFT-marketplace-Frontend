import { Address, checksumAddress, parseEther } from "viem";
import { USDTToken } from "@/constants/data";
import { CHAIN_ID } from "@/constants/env";

export const calculatePrice = (price: number, payToken: Address): number => {
  switch (checksumAddress(payToken || "0x0")) {
    case USDTToken[CHAIN_ID]:
      return price ? price / Math.pow(10, 6) : 0;
    default:
      return price ? price / Math.pow(10, 18) : 0;
  }
};

export const calculatePriceForContract = (
  price: number,
  payToken: Address
): bigint => {
  switch (checksumAddress(payToken || "0x0")) {
    case USDTToken[CHAIN_ID]:
      return price ? BigInt(price * Math.pow(10, 6)) : BigInt(0);
    default:
      return price ? parseEther(price.toString()) : BigInt(0);
  }
};
