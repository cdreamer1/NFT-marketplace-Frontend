import { Address } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Store {
  loading: boolean;
  setLoading: (newVal: boolean) => void;
}

export interface CollectionInfo {
  name: string;
  symbol: string;
  description: string;
  banner: string;
  icon: string;
  amount: string;
  nftType: string;
  nft: Address;
  creator: Address | string;
  intro: string;
}

export interface LaunchpadInfo {
  Name: string;
  Symbol: string;
  Description: string;
  BannerImage: string;
  IconImage: string;
  Amount: string;
  ERCType: string;
  ContractAddress: Address;
  Seller: Address;
  Price: number;
  IsCompleted: boolean;
  Intro: string;
  ID: string;
}

export interface NFTInfo {
  nft: Address;
  nftType: string;
  tokenId: number;
  name: string;
  nft_desc?: string;
  mainImage?: string;
  mediaType?: string;
  royalty: number;
  creator: Address;
  creatorImage: string;
  owner: Address;
  ownerImage: string;
  price: number;
  payToken: Address;
  amount?: number;
  startingTime?: number;
  endTime?: number;
  creatorName: string;
  creatorIntro: string;
  ownerName: string;
  collectionName: string;
  collectionImage: string;
  isFavor?: boolean;
}

export interface UserInfo {
  address: Address;
  name: string;
  bannerimg: string;
  avatarimg: string;
}

export interface PriceDataType {
  payToken: Address;
  price: number;
}

type CollectionStore = {
  collectionList: CollectionInfo[];
  setCollectionList: (newVal: CollectionInfo[]) => void;
};

type LaunchpadStore = {
  launchpadList: LaunchpadInfo[];
  setLaunchpadList: (newVal: LaunchpadInfo[]) => void;
};

type NFTStore = {
  nftInfo: NFTInfo;
  setNFTInfo: (newVal: NFTInfo) => void;
};

type UserStore = {
  userInfo: UserInfo;
  setUserInfo: (newVal: UserInfo) => void;
};

type PriceDataStore = {
  priceData: PriceDataType[];
  setPriceData: (newVal: PriceDataType[]) => void;
};

export const useDataStore = create<Store>()(
  persist(
    (set) => ({
      loading: false as boolean,
      setLoading: (newVal: boolean) => set({ loading: newVal }),
    }),
    {
      name: "status",
    }
  )
);

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set) => ({
      collectionList: [] as CollectionInfo[],
      setCollectionList: (newVal: CollectionInfo[]) =>
        set({ collectionList: newVal }),
    }),
    {
      name: "collection",
    }
  )
);

export const useLaunchpadStore = create<LaunchpadStore>()(
  persist(
    (set) => ({
      launchpadList: [] as LaunchpadInfo[],
      setLaunchpadList: (newVal: LaunchpadInfo[]) =>
        set({ launchpadList: newVal }),
    }),
    {
      name: "launchpad",
    }
  )
);

export const useNFTStore = create<NFTStore>()(
  persist(
    (set) => ({
      nftInfo: {} as NFTInfo,
      setNFTInfo: (newVal: NFTInfo) => set({ nftInfo: newVal }),
    }),
    {
      name: "NFT",
    }
  )
);

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userInfo: {} as UserInfo,
      setUserInfo: (newVal: UserInfo) => set({ userInfo: newVal }),
    }),
    {
      name: "User",
    }
  )
);

export const usePriceDataStore = create<PriceDataStore>()(
  persist(
    (set) => ({
      priceData: [] as Array<PriceDataType>,
      setPriceData: (newVal: PriceDataType[]) => set({ priceData: newVal }),
    }),
    {
      name: "User",
    }
  )
);
