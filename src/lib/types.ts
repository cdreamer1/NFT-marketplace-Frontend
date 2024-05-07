import { Address } from "viem";

export type CollectionType = {
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
};

export type SimpleCollectionType = {
  nft: Address;
  creator: Address;
  nftType: string;
};

export type ContractType = {
  blockNumber: string;
  blockTimestamp: string;
  creator: Address;
  feeRecipient: string;
  id: string;
  mintFee: number;
  nft: Address;
  nftType: string;
};

export type ListedItemType = {
  nft: Address;
  tokenId: number;
  mediaType: string;
  owner: Address;
  quantity: number;
  payToken: Address;
  pricePerItem: number;
  startingTime: number;
};

export type DataType = {
  nft: Address;
  nftType: string;
  tokenId: number;
  name: string;
  nft_desc: string;
  mainImage: string;
  mediaType: string;
  royalty: number;
  creator: Address;
  creatorImage: string;
  owner: Address;
  ownerImage: string;
  price: number;
  payToken: Address;
  amount: number;
  startingTime: number;
  endTime: number;
  creatorName: string;
  ownerName: string;
  isFavor: boolean;
};

export type FavoriteType = {
  Collection: Address;
  TokenId: number;
  UserAddress: Address;
};

export type TransferType = {
  nft: Address;
  tokenId: number;
  nftType: string;
  from: Address;
  to: Address;
};

export type FormValues = {
  username: string;
  email: string;
  verify: string;
  purchase_id: string;
  introduction: string;
  website: string;
  discord: string;
  x: string;
  youtube: string;
  instagram: string;
  bannerimage: string;
  avatarimage: string;
};

export type ActivityItemType = {
  nft: Address;
  tokenId: number;
  eventType: string;
  pricePerItem: number;
  payToken: Address;
  from: Address;
  to: Address;
  blockTimestamp: number;
};

export type ActivityDataType = {
  image: string;
  nftName: string;
  event: string;
  price: number;
  payToken: Address;
  from: Address;
  to: Address;
  date: number;
};

export type LaunchpadType = {
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
  Owners: number;
  VolumeTraded: number;
  Solds: number;
  Remain: number;
  FloorPrice: number;
  Total: number;
  StartTime: number;
  EndTime: number;
};

export type NFTDetailType = {
  owner_name: string;
  owner_img: string;
  creator_name: string;
  creator_img: string;
  creator_intro: string;
  col_img: string;
  col_name: string;
  nft_desc: string;
};

export type NFTMintType = {
  nft: Address;
  nftType: string;
  to: Address;
  tokenId: number;
};

export type OfferType = {
  pricePerItem: number;
  payToken: Address;
  creator: Address;
  blockTimestamp: number;
  deadline: number;
};

export type BidType = {
  payToken: Address;
  bid: number;
  bidder: Address;
  blockTimestamp: number;
};

export type TradeType = {
  eventType: string;
  pricePerItem: number;
  payToken: Address;
  from: Address;
  to: Address;
  blockTimestamp: number;
};

export type ItemSoldType = {
  seller: Address;
  buyer: Address;
  nft: Address;
  tokenId: number;
  pricePerItem: number;
  payToken: Address;
  blockTimestamp: number;
};

export type AuctionResultedType = {
  oldOwner: Address;
  winner: Address;
  nftAddress: Address;
  tokenId: number;
  winningBid: number;
  payToken: Address;
  blockTimestamp: number;
};

export type TradeVolumeUnitType = {
  nft: Address;
  value: number;
  payToken: Address;
};

export type TradeVolumeType = {
  nft: Address;
  name: string;
  prevVolumes: number;
  volumes: number;
  lowest: number;
  count: number;
};

export type UserInfoType = {
  Address: Address;
  UserName: string;
  BannerImage: string;
  AvatarImage: string;
  Introduction: string;
};

export type PriceInfoType = {
  price: number;
  payToken: Address;
};
